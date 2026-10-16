#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <LittleFS.h>
#include <rom/ets_sys.h>
#include "esp_heap_caps.h"

#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"

#define PIN_R1 9
#define PIN_G1 10
#define PIN_B1 8
#define PIN_R2 16
#define PIN_G2 11
#define PIN_B2 15
#define PIN_A 7
#define PIN_B 12
#define PIN_C 6
#define PIN_D 13
#define PIN_CLK 5
#define PIN_LAT 14
#define PIN_OE 4

#define MAX_SCENES 6
#define MAX_WIDTH 256
#define MAX_SCROLL_WIDTH 4096

#define TYPE_DEST_SCROLL_COUNT 4
#define TYPE_DEST_SCROLL_HEADER_SIZE 8
#define TYPE_DEST_SCROLL_DESC_SIZE 16
#define TYPE_DEST_SCROLL_TOTAL_HEADER (TYPE_DEST_SCROLL_HEADER_SIZE + TYPE_DEST_SCROLL_DESC_SIZE * TYPE_DEST_SCROLL_COUNT)
#define TYPE_DEST_SCROLL_MAGIC0 0x54
#define TYPE_DEST_SCROLL_MAGIC1 0x53
#define TYPE_DEST_SCROLL_MAGIC2 0x43
#define TYPE_DEST_SCROLL_MAGIC3 0x52
#define TYPE_DEST_SCROLL_VERSION 1

#define TYPE_DEST_SCROLL_SPEED 13
#define TYPE_DEST_SCROLL_DELAY ((21 - TYPE_DEST_SCROLL_SPEED) * 4)

volatile uint8_t* active_scenes[MAX_SCENES] = {nullptr};
volatile uint8_t* upload_scenes[MAX_SCENES] = {nullptr};
volatile uint16_t* active_scroll_bmp = nullptr;
volatile uint16_t* upload_scroll_bmp = nullptr;

volatile int cur_scene_count = 1;
volatile int cur_scroll_width = 0;
volatile int cur_scroll_speed = 10;
volatile int cur_x_off = 48;
volatile uint16_t scene_intervals[MAX_SCENES] = {3000, 3000, 3000, 3000, 3000, 3000};
volatile int current_scene_idx = 0;
volatile unsigned long last_scene_change = 0;
volatile float scroll_pos = 0.0;
volatile unsigned long last_scroll_update = 0;
volatile bool legacy_scroll_waiting = false;
volatile unsigned long legacy_scroll_wait_until = 0;
volatile bool is_updating = false;
volatile int hw_brightness = 20;
volatile int panel_width = 160;

volatile uint8_t slide_mode = 0x56;
volatile bool vertical_slide_enabled = false;
volatile bool is_sliding = false;
volatile int slide_offset = 0;
volatile int slide_from_scene = 0;
volatile int slide_to_scene = 0;
uint8_t* old_transitional_buf = nullptr;
unsigned long slide_start_time = 0;

uint16_t plane_delays[8] = {2, 4, 8, 16, 32, 64, 128, 256};
portMUX_TYPE scanMux = portMUX_INITIALIZER_UNLOCKED;

BLEServer *pServer = NULL;
BLECharacteristic *pRxCharacteristic = NULL;
bool deviceConnected = false;

uint8_t header_buf[22];
uint32_t expected_main_total_bytes = 0;
uint32_t upload_scroll_size = 0;

uint32_t data_set_mask[64];
uint32_t data_clr_mask[64];
uint32_t row_addr_set_mask[16];
uint32_t row_addr_clr_mask[16];

static const uint16_t RGB565_R_MASK[8] = { 0x2000, 0x4000, 0x8000, 0x0800, 0x1000, 0x2000, 0x4000, 0x8000 };
static const uint16_t RGB565_G_MASK[8] = { 0x0200, 0x0400, 0x0020, 0x0040, 0x0080, 0x0100, 0x0200, 0x0400 };
static const uint16_t RGB565_B_MASK[8] = { 0x0004, 0x0008, 0x0010, 0x0001, 0x0002, 0x0004, 0x0008, 0x0010 };

struct TypeDestinationScrollState {
    bool active;
    uint8_t kind;
    uint8_t lang;
    uint16_t width;
    uint8_t height;
    uint16_t areaLeft;
    uint16_t areaRight;
    uint8_t areaTop;
    uint8_t areaBottom;
    uint32_t dataLength;
    uint8_t bufferIndex;
    int32_t x;
    uint32_t lastUpdate;
};

uint16_t* typeDestinationScrollBuffers[TYPE_DEST_SCROLL_COUNT][2] = {
    {nullptr, nullptr}, {nullptr, nullptr}, {nullptr, nullptr}, {nullptr, nullptr}
};

TypeDestinationScrollState typeDestinationScroll[TYPE_DEST_SCROLL_COUNT];
TypeDestinationScrollState tdUploadStates[TYPE_DEST_SCROLL_COUNT];
uint8_t tdUploadBufferIndex[TYPE_DEST_SCROLL_COUNT];
uint8_t tdHeaderBuf[TYPE_DEST_SCROLL_TOTAL_HEADER];
uint32_t tdPacketOffset = 0;
uint32_t tdExpectedPacketSize = 0;
uint32_t tdPayloadTotal = 0;
int tdCurrentState = 0;
uint32_t tdCurrentStateOffset = 0;
bool tdHeaderReady = false;
bool tdUploadError = false;
bool tdPacketCommitted = false;
volatile bool tdReceiving = false;
volatile uint32_t last_ble_activity = 0;
uint8_t tdScrollSpeed = TYPE_DEST_SCROLL_SPEED;
uint32_t tdScrollDelay = TYPE_DEST_SCROLL_DELAY;

bool is_lz4_mode = false;
uint32_t lz4_decomp_size = 0;
uint32_t lz4_comp_size = 0;
uint32_t lz4_rx_offset = 0;
uint8_t* lz4_comp_buf = nullptr;
uint8_t lz4_header[9];

bool is_rle_mode = false;
uint8_t rle_state = 0;
uint8_t rle_count = 0;

struct TypeDestinationScrollSnapshot {
    bool active;
    uint16_t width;
    uint8_t height;
    uint16_t areaLeft;
    uint16_t areaRight;
    uint8_t areaTop;
    uint8_t areaBottom;
    const uint16_t* data;
    int32_t x;
};

void* allocateBuffer(size_t size, bool preferPSRAM) {
    if (size == 0) return nullptr;
    void* ptr = nullptr;
    if (preferPSRAM && psramFound()) {
        ptr = heap_caps_malloc(size, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
        if (ptr) return ptr;
    }
    ptr = heap_caps_malloc(size, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (ptr) return ptr;
    return nullptr;
}

static inline uint8_t IRAM_ATTR applyRGB565ToData(uint8_t data, uint16_t px, int plane, bool lowerHalf) {
    if (px == 0) return data;
    if (lowerHalf) {
        data &= 0xC7;
        if (px & RGB565_R_MASK[plane]) data |= 0x08;
        if (px & RGB565_G_MASK[plane]) data |= 0x10;
        if (px & RGB565_B_MASK[plane]) data |= 0x20;
    } else {
        data &= 0xF8;
        if (px & RGB565_R_MASK[plane]) data |= 0x01;
        if (px & RGB565_G_MASK[plane]) data |= 0x02;
        if (px & RGB565_B_MASK[plane]) data |= 0x04;
    }
    return data;
}

static inline uint8_t IRAM_ATTR applyTypeDestinationScrolls(uint8_t data, int plane, int row, int x, const TypeDestinationScrollSnapshot* states) {
    for (int i = 0; i < TYPE_DEST_SCROLL_COUNT; i++) {
        const TypeDestinationScrollSnapshot& s = states[i];
        if (!s.active || !s.data || s.width == 0 || s.height == 0 || x < s.areaLeft || x >= s.areaRight) continue;
        int sourceX = x - s.x;
        if (sourceX < 0 || sourceX >= s.width) continue;
        int y = row;
        if (y >= s.areaTop && y < s.areaBottom) {
            int sourceY = y - s.areaTop;
            if (sourceY >= 0 && sourceY < s.height) data = applyRGB565ToData(data, s.data[sourceX * s.height + sourceY], plane, false);
        }
        y = row + 16;
        if (y >= s.areaTop && y < s.areaBottom) {
            int sourceY = y - s.areaTop;
            if (sourceY >= 0 && sourceY < s.height) data = applyRGB565ToData(data, s.data[sourceX * s.height + sourceY], plane, true);
        }
    }
    return data;
}

void prepareUploadBuffers() {
    size_t singleSceneSize = (size_t)8 * 16 * panel_width;
    for (int i = 0; i < MAX_SCENES; i++) {
        if (upload_scenes[i]) {
            heap_caps_free((void*)upload_scenes[i]);
            upload_scenes[i] = nullptr;
        }
        if (i < cur_scene_count) {
            upload_scenes[i] = (uint8_t*)allocateBuffer(singleSceneSize, true);
        }
    }

    if (upload_scroll_bmp) {
        heap_caps_free((void*)upload_scroll_bmp);
        upload_scroll_bmp = nullptr;
    }
    if (upload_scroll_size > 0) {
        upload_scroll_bmp = (uint16_t*)allocateBuffer(upload_scroll_size, true);
    }
}

void commitMainUpload() {
    uint8_t* temp_transitional = nullptr;
    size_t singleSceneSize = (size_t)8 * 16 * panel_width;

    if (active_scenes[current_scene_idx] && vertical_slide_enabled) {
        temp_transitional = (uint8_t*)allocateBuffer(singleSceneSize, true);
        if (temp_transitional) {
            // 1. 旧メイン背景をコピー
            memcpy(temp_transitional, (void*)active_scenes[current_scene_idx], singleSceneSize);

            // 2. その時点の種別・行先表示を焼き込んで完全な旧画面を作る
            TypeDestinationScrollSnapshot tdSnapshot[TYPE_DEST_SCROLL_COUNT];
            bool tdActive = false;
            for (int i = 0; i < TYPE_DEST_SCROLL_COUNT; i++) {
                tdSnapshot[i].active = typeDestinationScroll[i].active;
                tdSnapshot[i].width = typeDestinationScroll[i].width;
                tdSnapshot[i].height = typeDestinationScroll[i].height;
                tdSnapshot[i].areaLeft = typeDestinationScroll[i].areaLeft;
                tdSnapshot[i].areaRight = typeDestinationScroll[i].areaRight;
                tdSnapshot[i].areaTop = typeDestinationScroll[i].areaTop;
                tdSnapshot[i].areaBottom = typeDestinationScroll[i].areaBottom;
                tdSnapshot[i].data = typeDestinationScrollBuffers[i][typeDestinationScroll[i].bufferIndex];
                tdSnapshot[i].x = typeDestinationScroll[i].x;
                if (tdSnapshot[i].active) tdActive = true;
            }

            if (tdActive) {
                for (int b = 0; b < 8; b++) {
                    for (int r = 0; r < 16; r++) {
                        for (int x = 0; x < panel_width; x++) {
                            size_t off = ((size_t)b * 16 + r) * (size_t)panel_width + x;
                            temp_transitional[off] = applyTypeDestinationScrolls(temp_transitional[off], b, r, x, tdSnapshot);
                        }
                    }
                }
            }
        }
    }

    uint16_t* old_scroll = (uint16_t*)active_scroll_bmp;
    uint8_t* old_trans_to_free = old_transitional_buf;
    uint8_t* old_scenes_to_free[MAX_SCENES] = {nullptr};

    portENTER_CRITICAL(&scanMux);

    old_transitional_buf = temp_transitional;

    for (int i = 0; i < MAX_SCENES; i++) {
        old_scenes_to_free[i] = (uint8_t*)active_scenes[i];
        active_scenes[i] = upload_scenes[i];
        upload_scenes[i] = nullptr;
    }

    active_scroll_bmp = upload_scroll_bmp;
    upload_scroll_bmp = nullptr;

    if (cur_scroll_width <= 0 && active_scroll_bmp) {
        uint16_t* to_free = (uint16_t*)active_scroll_bmp;
        active_scroll_bmp = nullptr;
        if (to_free) heap_caps_free(to_free);
    }

    current_scene_idx = 0;

    int dispArea = panel_width - cur_x_off;
    if (dispArea < 0) dispArea = 0;
    scroll_pos = (float)(-dispArea);

    if (old_transitional_buf && vertical_slide_enabled) {
        slide_from_scene = 0;
        slide_to_scene = 0;
        slide_offset = 0;
        slide_start_time = millis();
        is_sliding = true;
    } else {
        is_sliding = false;
    }

    portEXIT_CRITICAL(&scanMux);

    for (int i = 0; i < MAX_SCENES; i++) {
        if (old_scenes_to_free[i]) heap_caps_free(old_scenes_to_free[i]);
    }
    if (old_scroll) heap_caps_free(old_scroll);
    if (old_trans_to_free) heap_caps_free(old_trans_to_free);
}

void updatePlaneDelays() {
    int bright = hw_brightness;
    if (bright < 1) bright = 1;
    if (bright > 50) bright = 50;

    for (int b = 0; b < 8; b++) {
        uint32_t base = (1UL << b);
        uint32_t us = (base * (uint32_t)bright + 12) / 25;
        if (us < 1) us = 1;
        plane_delays[b] = (uint16_t)us;
    }
}

void buildOutputMasks() {
    for (int data = 0; data < 64; data++) {
        uint32_t setMask = 0, clrMask = 0;
        if (data & 0x01) setMask |= (1UL << PIN_R1); else clrMask |= (1UL << PIN_R1);
        if (data & 0x02) setMask |= (1UL << PIN_G1); else clrMask |= (1UL << PIN_G1);
        if (data & 0x04) setMask |= (1UL << PIN_B1); else clrMask |= (1UL << PIN_B1);
        if (data & 0x08) setMask |= (1UL << PIN_R2); else clrMask |= (1UL << PIN_R2);
        if (data & 0x10) setMask |= (1UL << PIN_G2); else clrMask |= (1UL << PIN_G2);
        if (data & 0x20) setMask |= (1UL << PIN_B2); else clrMask |= (1UL << PIN_B2);
        data_set_mask[data] = setMask;
        data_clr_mask[data] = clrMask;
    }
    for (int r = 0; r < 16; r++) {
        uint32_t setMask = 0, clrMask = 0;
        if (r & 0x01) setMask |= (1UL << PIN_A); else clrMask |= (1UL << PIN_A);
        if (r & 0x02) setMask |= (1UL << PIN_B); else clrMask |= (1UL << PIN_B);
        if (r & 0x04) setMask |= (1UL << PIN_C); else clrMask |= (1UL << PIN_C);
        if (r & 0x08) setMask |= (1UL << PIN_D); else clrMask |= (1UL << PIN_D);
        row_addr_set_mask[r] = setMask;
        row_addr_clr_mask[r] = clrMask;
    }
}

uint8_t getDecompressedByte(size_t pos) {
    if (pos < 22) {
        return header_buf[pos];
    }
    pos -= 22;
    if (pos < upload_scroll_size) {
        if (upload_scroll_bmp) return ((uint8_t*)upload_scroll_bmp)[pos];
        return 0;
    }
    pos -= upload_scroll_size;
    size_t singleSceneSize = (size_t)8 * 16 * panel_width;
    size_t sIdx = pos / singleSceneSize;
    size_t sOff = pos % singleSceneSize;
    if (sIdx < MAX_SCENES && upload_scenes[sIdx]) {
        return upload_scenes[sIdx][sOff];
    }
    return 0;
}

void processByteToUpload(uint8_t b, size_t pos) {
    if (pos < 22) {
        header_buf[pos] = b;
        if (pos == 21) {
            slide_mode = header_buf[1];
            vertical_slide_enabled = (slide_mode != 0x56);
            cur_scene_count = header_buf[2];
            if (cur_scene_count < 1) cur_scene_count = 1;
            if (cur_scene_count > MAX_SCENES) cur_scene_count = MAX_SCENES;
            cur_scroll_speed = header_buf[3];
            cur_scroll_width = header_buf[4] | ((int)header_buf[5] << 8);
            if (cur_scroll_width < 0) cur_scroll_width = 0;
            if (cur_scroll_width > MAX_SCROLL_WIDTH) cur_scroll_width = MAX_SCROLL_WIDTH;
            cur_x_off = header_buf[6];

            for(int i=0; i<6; i++) {
                scene_intervals[i] = header_buf[7 + i*2] | ((uint16_t)header_buf[8 + i*2] << 8);
            }
            hw_brightness = header_buf[19];
            if (hw_brightness == 0) hw_brightness = 20;
            panel_width = header_buf[20] | ((uint16_t)header_buf[21] << 8);
            if (panel_width < 64 || panel_width > MAX_WIDTH) panel_width = 160;

            updatePlaneDelays();
            upload_scroll_size = (uint32_t)cur_scroll_width * 16UL * 2UL;
            expected_main_total_bytes = 22UL + upload_scroll_size + ((uint32_t)cur_scene_count * 8UL * 16UL * (uint32_t)panel_width);

            prepareUploadBuffers();
        }
    } else if (pos < 22 + upload_scroll_size) {
        size_t off = pos - 22;
        if (upload_scroll_bmp) {
            ((uint8_t*)upload_scroll_bmp)[off] = b;
        }
    } else {
        size_t off = pos - 22 - upload_scroll_size;
        size_t singleSceneSize = (size_t)8 * 16 * panel_width;
        size_t sIdx = off / singleSceneSize;
        size_t sOff = off % singleSceneSize;
        if (sIdx < (size_t)cur_scene_count && upload_scenes[sIdx]) {
            upload_scenes[sIdx][sOff] = b;
        }
    }
}

bool decompressLZ4Direct(const uint8_t* src, int srcLen) {
    int ip = 0;
    size_t op = 0;

    while (ip < srcLen) {
        uint8_t token = src[ip++];
        int litLen = token >> 4;

        if (litLen == 15) {
            uint8_t s;
            do {
                if (ip >= srcLen) return false;
                s = src[ip++];
                litLen += s;
            } while (s == 255);
        }

        if (ip + litLen > srcLen) return false;
        for (int i = 0; i < litLen; i++) {
            processByteToUpload(src[ip++], op++);
        }

        if (ip >= srcLen) break;

        if (ip + 2 > srcLen) return false;
        uint16_t offset = src[ip] | (src[ip + 1] << 8);
        ip += 2;

        if (offset == 0 || offset > op) return false;

        int matchLen = (token & 0x0F) + 4;
        if ((token & 0x0F) == 15) {
            uint8_t s;
            do {
                if (ip >= srcLen) return false;
                s = src[ip++];
                matchLen += s;
            } while (s == 255);
        }

        size_t matchPos = op - offset;
        for (int i = 0; i < matchLen; i++) {
            uint8_t b = getDecompressedByte(matchPos + i);
            processByteToUpload(b, op++);
        }
    }
    return (op == expected_main_total_bytes);
}

bool parseTypeDestinationScrollHeader() {
    if (tdHeaderBuf[0] != TYPE_DEST_SCROLL_MAGIC0 || tdHeaderBuf[1] != TYPE_DEST_SCROLL_MAGIC1 || tdHeaderBuf[2] != TYPE_DEST_SCROLL_MAGIC2 || tdHeaderBuf[3] != TYPE_DEST_SCROLL_MAGIC3) return false;
    if (tdHeaderBuf[4] != TYPE_DEST_SCROLL_VERSION) return false;
    
    tdScrollSpeed = tdHeaderBuf[6];
    if (tdScrollSpeed == 0 || tdScrollSpeed > 21) tdScrollSpeed = TYPE_DEST_SCROLL_SPEED;
    tdScrollDelay = (uint32_t)(21 - tdScrollSpeed) * 4UL;

    for (int i = 0; i < TYPE_DEST_SCROLL_COUNT; i++) {
        size_t p = TYPE_DEST_SCROLL_HEADER_SIZE + i * TYPE_DEST_SCROLL_DESC_SIZE;
        memset(&tdUploadStates[i], 0, sizeof(tdUploadStates[i]));
        tdUploadStates[i].active = tdHeaderBuf[p + 0] != 0;
        tdUploadStates[i].kind = tdHeaderBuf[p + 1];
        tdUploadStates[i].lang = tdHeaderBuf[p + 2];
        tdUploadStates[i].width = tdHeaderBuf[p + 3] | ((uint16_t)tdHeaderBuf[p + 4] << 8);
        tdUploadStates[i].height = tdHeaderBuf[p + 5];
        tdUploadStates[i].areaLeft = tdHeaderBuf[p + 6] | ((uint16_t)tdHeaderBuf[p + 7] << 8);
        tdUploadStates[i].areaRight = tdHeaderBuf[p + 8] | ((uint16_t)tdHeaderBuf[p + 9] << 8);
        tdUploadStates[i].areaTop = tdHeaderBuf[p + 10];
        tdUploadStates[i].areaBottom = tdHeaderBuf[p + 11];
        tdUploadStates[i].dataLength = (uint32_t)tdHeaderBuf[p + 12] | ((uint32_t)tdHeaderBuf[p + 13] << 8) | ((uint32_t)tdHeaderBuf[p + 14] << 16) | ((uint32_t)tdHeaderBuf[p + 15] << 24);
        
        tdUploadBufferIndex[i] = 1 - typeDestinationScroll[i].bufferIndex;
    }
    tdPayloadTotal = 0;
    for (int i = 0; i < TYPE_DEST_SCROLL_COUNT; i++) tdPayloadTotal += tdUploadStates[i].dataLength;
    tdExpectedPacketSize = TYPE_DEST_SCROLL_TOTAL_HEADER + tdPayloadTotal;

    for (int i = 0; i < TYPE_DEST_SCROLL_COUNT; i++) {
        int uploadIndex = tdUploadBufferIndex[i];
        if (typeDestinationScrollBuffers[i][uploadIndex]) heap_caps_free(typeDestinationScrollBuffers[i][uploadIndex]);
        
        if (tdUploadStates[i].dataLength > 0 && tdUploadStates[i].active) {
            typeDestinationScrollBuffers[i][uploadIndex] = (uint16_t*)allocateBuffer(tdUploadStates[i].dataLength, true);
        } else {
            typeDestinationScrollBuffers[i][uploadIndex] = nullptr;
        }
        tdUploadStates[i].bufferIndex = uploadIndex;
        tdUploadStates[i].x = tdUploadStates[i].areaRight;
        tdUploadStates[i].lastUpdate = millis();
    }
    return true;
}

void advanceZeroLengthStates() {
    while (tdCurrentState < TYPE_DEST_SCROLL_COUNT && tdCurrentStateOffset >= tdUploadStates[tdCurrentState].dataLength) {
        tdCurrentState++;
        tdCurrentStateOffset = 0;
    }
}

void commitTypeDestinationScrollPacket() {
    portENTER_CRITICAL(&scanMux);
    for (int i = 0; i < TYPE_DEST_SCROLL_COUNT; i++) {
        int newIndex = tdUploadBufferIndex[i];
        int oldIndex = typeDestinationScroll[i].bufferIndex;
        typeDestinationScroll[i] = tdUploadStates[i];
        typeDestinationScroll[i].bufferIndex = newIndex;
        typeDestinationScroll[i].x = typeDestinationScroll[i].areaRight;
        typeDestinationScroll[i].lastUpdate = millis();

        if (oldIndex >= 0 && oldIndex < 2 && typeDestinationScrollBuffers[i][oldIndex]) {
            heap_caps_free(typeDestinationScrollBuffers[i][oldIndex]);
            typeDestinationScrollBuffers[i][oldIndex] = nullptr;
        }

        if (!typeDestinationScroll[i].active) {
            if (typeDestinationScrollBuffers[i][newIndex]) {
                heap_caps_free(typeDestinationScrollBuffers[i][newIndex]);
                typeDestinationScrollBuffers[i][newIndex] = nullptr;
            }
        }
    }
    portEXIT_CRITICAL(&scanMux);
    tdPacketCommitted = true;
}

void processTypeDestinationScrollData(uint8_t* buf, size_t size) {
    if (tdUploadError) return;
    size_t p = 0;

    while (p < size) {
        if (tdPacketOffset < TYPE_DEST_SCROLL_TOTAL_HEADER) {
            tdHeaderBuf[tdPacketOffset++] = buf[p++];
            if (tdPacketOffset == TYPE_DEST_SCROLL_TOTAL_HEADER) {
                if (!parseTypeDestinationScrollHeader()) {
                    tdUploadError = true;
                    tdReceiving = false;
                    return;
                }
                tdHeaderReady = true;
                tdCurrentState = 0;
                tdCurrentStateOffset = 0;
                advanceZeroLengthStates();
            }
            continue;
        }

        advanceZeroLengthStates();
        if (tdCurrentState >= TYPE_DEST_SCROLL_COUNT) return;

        uint8_t* target = (uint8_t*)typeDestinationScrollBuffers[tdCurrentState][tdUploadBufferIndex[tdCurrentState]];
        size_t remaining = size - p;
        size_t needed = tdUploadStates[tdCurrentState].dataLength - tdCurrentStateOffset;
        size_t copy_bytes = (remaining < needed) ? remaining : needed;

        if (target && copy_bytes > 0) {
            memcpy(target + tdCurrentStateOffset, buf + p, copy_bytes);
        }
        tdCurrentStateOffset += copy_bytes;
        tdPacketOffset += copy_bytes;
        p += copy_bytes;

        advanceZeroLengthStates();
    }
}

void processTypeDestByteStream(uint8_t b) {
    processTypeDestinationScrollData(&b, 1);
    if (tdPacketOffset >= tdExpectedPacketSize && tdHeaderReady) {
        commitTypeDestinationScrollPacket();
        tdReceiving = false;
        is_rle_mode = false;
    }
}

void handleTypeDestRLEChunk(uint8_t* data, size_t len) {
    for (size_t i = 0; i < len; i++) {
        uint8_t b = data[i];
        if (rle_state == 0) {
            if (b == 0xFE) {
                rle_state = 1;
            } else {
                processTypeDestByteStream(b);
            }
        } else if (rle_state == 1) {
            rle_count = b;
            rle_state = 2;
        } else if (rle_state == 2) {
            for (uint16_t k = 0; k < rle_count; k++) {
                processTypeDestByteStream(b);
            }
            rle_state = 0;
        }
    }
}

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        uint8_t* data = pCharacteristic->getData();
        size_t len = pCharacteristic->getLength();
        if (len == 0) return;

        last_ble_activity = millis();

        if (!is_updating && !tdReceiving && !is_lz4_mode && !is_rle_mode) {
            if (len > 0 && data[0] == 0xC4) {
                is_lz4_mode = true;
                lz4_rx_offset = 0;
                lz4_decomp_size = 0;
                lz4_comp_size = 0;
                if (lz4_comp_buf) {
                    heap_caps_free(lz4_comp_buf);
                    lz4_comp_buf = nullptr;
                }
            } else if (len > 0 && data[0] == 0xCF) {
                is_rle_mode = true;
                tdReceiving = true;
                rle_state = 0;
                tdPacketOffset = 0;
                tdExpectedPacketSize = 0;
                tdPayloadTotal = 0;
                tdCurrentState = 0;
                tdCurrentStateOffset = 0;
                tdHeaderReady = false;
                tdUploadError = false;
                tdPacketCommitted = false;
                data++;
                len--;
            }
        }

        if (is_rle_mode) {
            handleTypeDestRLEChunk(data, len);
        } else if (is_lz4_mode) {
            size_t p = 0;
            while (p < len) {
                if (lz4_rx_offset < 9) {
                    lz4_header[lz4_rx_offset++] = data[p++];
                    if (lz4_rx_offset == 9) {
                        lz4_decomp_size = lz4_header[1] | (lz4_header[2] << 8) | (lz4_header[3] << 16) | (lz4_header[4] << 24);
                        lz4_comp_size = lz4_header[5] | (lz4_header[6] << 8) | (lz4_header[7] << 16) | (lz4_header[8] << 24);

                        if (lz4_comp_size == 0 || lz4_decomp_size == 0 || lz4_comp_size > 262144) {
                            is_lz4_mode = false;
                            return;
                        }
                        lz4_comp_buf = (uint8_t*)allocateBuffer(lz4_comp_size, true);
                        if (!lz4_comp_buf) {
                            is_lz4_mode = false;
                            return;
                        }
                    }
                    continue;
                }

                uint32_t needed = lz4_comp_size - (lz4_rx_offset - 9);
                uint32_t remaining = len - p;
                uint32_t copyBytes = (remaining < needed) ? remaining : needed;

                if (lz4_comp_buf && copyBytes > 0) {
                    memcpy(lz4_comp_buf + (lz4_rx_offset - 9), data + p, copyBytes);
                }
                lz4_rx_offset += copyBytes;
                p += copyBytes;

                if (lz4_rx_offset >= 9 + lz4_comp_size) {
                    is_updating = true;
                    if (decompressLZ4Direct(lz4_comp_buf, lz4_comp_size)) {
                        commitMainUpload();
                        last_scene_change = millis();
                        last_scroll_update = millis();
                    }
                    if (lz4_comp_buf) {
                        heap_caps_free(lz4_comp_buf);
                        lz4_comp_buf = nullptr;
                    }
                    is_updating = false;
                    is_lz4_mode = false;
                }
            }
        }
    }
};

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        deviceConnected = true;
    };
    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        pServer->getAdvertising()->start();
    }
};

static inline uint8_t IRAM_ATTR get_scene_pixel_bits(const volatile uint8_t* const* scene_array, int scene_idx, int plane, int y_src, int x, int pWidth) {
    if (!scene_array || scene_idx < 0 || scene_idx >= MAX_SCENES) return 0;
    const volatile uint8_t* scene_buf = scene_array[scene_idx];
    if (!scene_buf) return 0;
    int r_src = y_src % 16;
    size_t offset = ((size_t)plane * 16 + r_src) * (size_t)pWidth + x;
    uint8_t raw = scene_buf[offset];
    if (y_src < 16) {
        return raw & 0x07;
    } else {
        return (raw >> 3) & 0x07;
    }
}

static inline uint8_t IRAM_ATTR get_scene_pixel_bits_single(const volatile uint8_t* scene_buf, int plane, int y_src, int x, int pWidth) {
    if (!scene_buf) return 0;
    int r_src = y_src % 16;
    size_t offset = ((size_t)plane * 16 + r_src) * (size_t)pWidth + x;
    uint8_t raw = scene_buf[offset];
    if (y_src < 16) {
        return raw & 0x07;
    } else {
        return (raw >> 3) & 0x07;
    }
}

void IRAM_ATTR scan() {
    if (is_updating) return;

    TypeDestinationScrollSnapshot tdSnapshot[TYPE_DEST_SCROLL_COUNT];
    bool tdActive = false;

    bool local_sliding;
    int local_slide_offset;
    int local_from_scene;
    int local_to_scene;
    int currentScene;
    uint8_t* local_transitional_buf;

    portENTER_CRITICAL_ISR(&scanMux);
    local_sliding = is_sliding;
    local_slide_offset = slide_offset;
    local_from_scene = slide_from_scene;
    local_to_scene = slide_to_scene;
    currentScene = current_scene_idx;
    local_transitional_buf = old_transitional_buf;
    portEXIT_CRITICAL_ISR(&scanMux);

    // スライド中でない場合のみ、種別・行先レイヤーを有効化
    if (!local_sliding) {
        for (int i = 0; i < TYPE_DEST_SCROLL_COUNT; i++) {
            tdSnapshot[i].active = typeDestinationScroll[i].active;
            tdSnapshot[i].width = typeDestinationScroll[i].width;
            tdSnapshot[i].height = typeDestinationScroll[i].height;
            tdSnapshot[i].areaLeft = typeDestinationScroll[i].areaLeft;
            tdSnapshot[i].areaRight = typeDestinationScroll[i].areaRight;
            tdSnapshot[i].areaTop = typeDestinationScroll[i].areaTop;
            tdSnapshot[i].areaBottom = typeDestinationScroll[i].areaBottom;
            tdSnapshot[i].data = typeDestinationScrollBuffers[i][typeDestinationScroll[i].bufferIndex];
            tdSnapshot[i].x = typeDestinationScroll[i].x;
            if (tdSnapshot[i].active) tdActive = true;
        }
    }

    int sWidth = cur_scroll_width;
    int xOff = cur_x_off;
    int pWidth = panel_width;

    const uint32_t pin_clk = (1UL << PIN_CLK);
    const uint32_t pin_lat = (1UL << PIN_LAT);
    const uint32_t pin_oe = (1UL << PIN_OE);

    for (int b = 0; b < 8; b++) {
        for (int r = 0; r < 16; r++) {
            for (int x = 0; x < pWidth; x++) {
                uint8_t data = 0;

                if (local_sliding) {
                    int y_top = r;
                    int src_top_y, src_top_scene;

                    if (y_top < local_slide_offset) {
                        src_top_y = y_top + 32 - local_slide_offset;
                        src_top_scene = local_to_scene;
                        data |= get_scene_pixel_bits(active_scenes, src_top_scene, b, src_top_y, x, pWidth);
                    } else {
                        src_top_y = y_top - local_slide_offset;
                        if (local_transitional_buf) {
                            data |= get_scene_pixel_bits_single(local_transitional_buf, b, src_top_y, x, pWidth);
                        } else {
                            src_top_scene = local_from_scene;
                            data |= get_scene_pixel_bits(active_scenes, src_top_scene, b, src_top_y, x, pWidth);
                        }
                    }

                    int y_bot = r + 16;
                    int src_bot_y, src_bot_scene;

                    if (y_bot < local_slide_offset) {
                        src_bot_y = y_bot + 32 - local_slide_offset;
                        src_bot_scene = local_to_scene;
                        data |= (get_scene_pixel_bits(active_scenes, src_bot_scene, b, src_bot_y, x, pWidth) << 3);
                    } else {
                        src_bot_y = y_bot - local_slide_offset;
                        if (local_transitional_buf) {
                            data |= (get_scene_pixel_bits_single(local_transitional_buf, b, src_bot_y, x, pWidth) << 3);
                        } else {
                            src_bot_scene = local_from_scene;
                            data |= (get_scene_pixel_bits(active_scenes, src_bot_scene, b, src_bot_y, x, pWidth) << 3);
                        }
                    }
                } else {
                    data = get_scene_pixel_bits(active_scenes, currentScene, b, r, x, pWidth) | (get_scene_pixel_bits(active_scenes, currentScene, b, r + 16, x, pWidth) << 3);
                }

                if (sWidth > 0 && active_scroll_bmp && x >= xOff) {
                    int tx = x - (pWidth - (int)scroll_pos);
                    if (tx >= 0 && tx < sWidth) {
                        uint16_t px = active_scroll_bmp[tx * 16 + r];
                        if (px > 0) {
                            data &= 0x07;
                            if (px & RGB565_R_MASK[b]) data |= 0x08;
                            if (px & RGB565_G_MASK[b]) data |= 0x10;
                            if (px & RGB565_B_MASK[b]) data |= 0x20;
                        }
                    }
                }
                if (tdActive) data = applyTypeDestinationScrolls(data, b, r, x, tdSnapshot);

                GPIO.out_w1ts = data_set_mask[data];
                GPIO.out_w1tc = data_clr_mask[data];
                GPIO.out_w1ts = pin_clk;
                asm volatile("nop");
                GPIO.out_w1tc = pin_clk;
            }

            GPIO.out_w1ts = pin_oe;
            GPIO.out_w1ts = row_addr_set_mask[r];
            GPIO.out_w1tc = row_addr_clr_mask[r];
            
            GPIO.out_w1ts = pin_lat;
            asm volatile("nop; nop; nop; nop;");
            GPIO.out_w1tc = pin_lat;
            asm volatile("nop; nop;");

            GPIO.out_w1tc = pin_oe;
            if (plane_delays[b] > 0) {
                esp_rom_delay_us(plane_delays[b]);
            }
            GPIO.out_w1ts = pin_oe;
        }
    }
}

void core0Task(void* pvParameters) {
    while (1) {
        unsigned long now = millis();
        if ((is_updating || tdReceiving || is_lz4_mode || is_rle_mode) && (uint32_t)(now - last_ble_activity) > 2000UL) {
            tdReceiving = false;
            is_updating = false;
            is_lz4_mode = false;
            is_rle_mode = false;
        }

        int sceneIndex = current_scene_idx;
        if (sceneIndex < 0 || sceneIndex >= MAX_SCENES) sceneIndex = 0;
        uint16_t curInterval = scene_intervals[sceneIndex];
        if (curInterval == 0) curInterval = 3000;

        if (!is_sliding && (now - last_scene_change > curInterval)) {
            if (cur_scene_count > 1) {
                if (vertical_slide_enabled) {
                    portENTER_CRITICAL(&scanMux);
                    slide_from_scene = current_scene_idx;
                    slide_to_scene = (current_scene_idx + 1) % cur_scene_count;
                    slide_offset = 0;
                    slide_start_time = now;
                    is_sliding = true;
                    portEXIT_CRITICAL(&scanMux);
                } else {
                    current_scene_idx = (current_scene_idx + 1) % cur_scene_count;
                    last_scene_change = now;
                }
            } else {
                last_scene_change = now;
            }
        }

        if (is_sliding) {
            unsigned long elapsed = now - slide_start_time;
            bool is_choppy = (slide_mode == 0x59 || slide_mode == 0x5A);
            bool is_mode2 = (slide_mode == 0x58 || slide_mode == 0x5A);

            if (!is_mode2) {
                const unsigned long duration = 750;
                float progress = (float)elapsed / (float)duration;
                if (progress > 1.0f) progress = 1.0f;

                if (!is_choppy) {
                    slide_offset = (int)roundf(progress * 32.0f);
                } else {
                    slide_offset = (int)(roundf(progress * 32.0f / 2.0f) * 2.0f);
                }

                if (elapsed >= duration) {
                    portENTER_CRITICAL(&scanMux);
                    current_scene_idx = slide_to_scene;
                    is_sliding = false;
                    if (old_transitional_buf) {
                        heap_caps_free(old_transitional_buf);
                        old_transitional_buf = nullptr;
                    }
                    portEXIT_CRITICAL(&scanMux);

                    last_scene_change = millis();
                }
            } else {
                const float duration = 1000.0f;
                const float tailStartProgress = 0.75f;
                const float tailStartTime = 572.352f;
                const float tailDuration = 1282.944f;
                const float totalDuration = 1855.296f;
                const float m_exponent = 6.712128f;

                float progress = 0.0f;
                if ((float)elapsed < tailStartTime) {
                    float t = (float)elapsed / duration;
                    if (t > 1.0f) t = 1.0f;
                    progress = (sinf((t * 4.0f / 3.0f - 1.0f / 3.0f) * M_PI_2) + 0.5f) * (2.0f / 3.0f);
                } else {
                    float u = ((float)elapsed - tailStartTime) / tailDuration;
                    if (u > 1.0f) u = 1.0f;
                    float easedTail = 1.0f - powf(1.0f - u, m_exponent);
                    progress = tailStartProgress + (1.0f - tailStartProgress) * easedTail;
                }

                if (!is_choppy) {
                    slide_offset = (int)roundf(progress * 32.0f);
                } else {
                    float step_dots = 1.0f;
                    if ((float)elapsed < 100.0f) step_dots = 4.0f;
                    else if ((float)elapsed < tailStartTime) step_dots = 3.0f;
                    else if ((float)elapsed < totalDuration - 100.0f) step_dots = 1.0f;
                    else step_dots = 0.5f;

                    slide_offset = (int)(roundf(progress * 32.0f / step_dots) * step_dots);
                }

                if ((float)elapsed >= totalDuration) {
                    portENTER_CRITICAL(&scanMux);
                    current_scene_idx = slide_to_scene;
                    is_sliding = false;
                    if (old_transitional_buf) {
                        heap_caps_free(old_transitional_buf);
                        old_transitional_buf = nullptr;
                    }
                    portEXIT_CRITICAL(&scanMux);

                    last_scene_change = millis();
                }
            }
        }

        if (cur_scroll_width > 0 && active_scroll_bmp) {
            int scrollDelay = (21 - cur_scroll_speed) * 4;
            if (scrollDelay < 1) scrollDelay = 1;
            int dispArea = panel_width - cur_x_off;
            if (dispArea < 0) dispArea = 0;

            if (legacy_scroll_waiting) {
                if ((long)(now - legacy_scroll_wait_until) >= 0) {
                    scroll_pos = 0.0f;
                    legacy_scroll_waiting = false;
                    last_scroll_update = now;
                }
            } else if (now - last_scroll_update >= (unsigned long)scrollDelay) {
                scroll_pos += 1.0f;
                if (scroll_pos > cur_scroll_width + dispArea) {
                    legacy_scroll_waiting = true;
                    legacy_scroll_wait_until = now + 500;
                }
                last_scroll_update = now;
            }
        }

        for (int i = 0; i < TYPE_DEST_SCROLL_COUNT; i++) {
            if (typeDestinationScroll[i].active && typeDestinationScroll[i].width > 0) {
                uint32_t delay = tdScrollDelay > 0 ? tdScrollDelay : 30;
                if (now - typeDestinationScroll[i].lastUpdate >= delay) {
                    typeDestinationScroll[i].x--;
                    if (typeDestinationScroll[i].x < (int32_t)typeDestinationScroll[i].areaLeft - (int32_t)typeDestinationScroll[i].width) {
                        typeDestinationScroll[i].x = typeDestinationScroll[i].areaRight;
                    }
                    typeDestinationScroll[i].lastUpdate = now;
                }
            }
        }

        vTaskDelay(pdMS_TO_TICKS(1));
    }
}

void setup() {
    Serial.begin(115200);
    setCpuFrequencyMhz(240);
    int pins[] = { PIN_R1, PIN_G1, PIN_B1, PIN_R2, PIN_G2, PIN_B2, PIN_A, PIN_B, PIN_C, PIN_D, PIN_CLK, PIN_LAT, PIN_OE };
    for (int p : pins) pinMode(p, OUTPUT);
    digitalWrite(PIN_OE, LOW);

    buildOutputMasks();
    updatePlaneDelays();

    cur_scene_count = 1;
    panel_width = 160;
    hw_brightness = 20;
    updatePlaneDelays();

    LittleFS.begin(true);

    BLEDevice::init("ESP32_LED_Matrix");
    BLEDevice::setMTU(512);

    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());

    BLEService *pService = pServer->createService(SERVICE_UUID);
    pRxCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID_RX,
        BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
    );
    pRxCharacteristic->setCallbacks(new MyCallbacks());
    pService->start();

    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();

    xTaskCreatePinnedToCore(core0Task, "Core0Task", 16384, NULL, 1, NULL, 0);
}

void loop() {
    scan();
}
