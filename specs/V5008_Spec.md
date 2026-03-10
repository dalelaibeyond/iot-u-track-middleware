# V5008 Device MQTT Message RAW and SIF Spec

**File Name:** `V5008_Spec.md`

**Version**: 1.0

**Date**: 2026-03-04

**Scope:** V5008 device raw binary message format and Spec from raw to SIF (Standard Intermediate Format) Conversion

---

---

## 1. Parsing Strategy

### 1.1 Message Identification Logic

The parser determines `messageType` using this strict precedence:

1. **Topic Suffix Check:**
   - `.../LabelState` → `RFID_SNAPSHOT`
   - `.../TemHum` → `TEMP_HUM`
   - `.../Noise` → `NOISE_LEVEL`
2. **Header Byte Check (Byte 0):**
   - `0xBA` → `DOOR_STATE`
   - `0xCC` or `0xCB` → `HEARTBEAT`
3. **Extended Header Check (Bytes 0-1):**
   - `0xEF01` → `DEVICE_INFO`
   - `0xEF02` → `MODULE_INFO`
4. **Command Response Check (Header 0xAA):**
   - Read Byte 5 for `0xE4` (QUERY_COLOR_RESP):
     - `0xE4` → `QUERY_COLOR_RESP`
   - Read Byte 6 for other command codes:
     - `0xE1` → `SET_COLOR_RESP`
     - `0xE2` → `CLEAR_ALARM_RESP`

**Note:** All multi-byte fields are Big-Endian.

**Topic Extraction Notation:**

- `Topic[1]` refers to the `{deviceId}` placeholder in the MQTT topic path
- Example: `V5008Upload/{deviceId}/OpeAck` → Extract the second segment as deviceId
- Example: `V5008Upload/2437871205/OpeAck` → deviceId = "2437871205"

---

## 2. Binary Field to SIF Mapping

**CRITICAL:** The parser must map the **Binary Field Name** (from Section 6 Schemas) to the specific **SIF JSON Key**.

| Binary Field Name  | Byte Size | SIF JSON Key  | Parsing Rule / Data Type                                                                                                                                                          |
| ------------------ | --------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Common Fields**  |           |               |                                                                                                                                                                                   |
| `DeviceId`         | 4B        | `deviceId`    | **Context Dependent:**<br>1. Header `AA`: Bytes [1-4] → String.<br>2. Others: Extract from MQTT Topic.                                                                            |
| `MsgId`            | 4B        | `messageId`   | Last 4 bytes of packet → String (always STRING type for both V5008 and V6800). Refer to Algorithm D                                                                               |
| `ModId`            | 4B        | `moduleId`    | `uint32_be` → String. Refer to Algorithm D                                                                                                                                        |
| `ModAddr`          | 1B        | `moduleIndex` | `uint8` (Range 1-5). use `moduleIndex: modAddr` directly                                                                                                                          |
| `Res`              | 1B        | -             | Reserved field. Not used in SIF (discarded by design).                                                                                                                            |
| **Sensor Indices** |           |               |                                                                                                                                                                                   |
| `Addr` (Temp)      | 1B        | `sensorIndex` | `uint8` (Range 10-15).                                                                                                                                                            |
| `Addr` (Noise)     | 1B        | `sensorIndex` | `uint8` (Range 16-18).                                                                                                                                                            |
| `uPos`             | 1B        | `sensorIndex` | `uint8` (Range 1-54).                                                                                                                                                             |
| **Values**         |           |               |                                                                                                                                                                                   |
| `Total`            | 1B        | `uTotal`      | `uint8`.                                                                                                                                                                          |
| `Count`            | 1B        | `onlineCount` | `uint8`.                                                                                                                                                                          |
| `Alarm`            | 1B        | `isAlarm`     | `0x00`=false, `0x01`=true.                                                                                                                                                        |
| `TagId`            | 4B        | `tagId`       | Hex String (Uppercase).                                                                                                                                                           |
| `State`            | 1B        | `doorState`   | `uint8` (0 or 1).                                                                                                                                                                 |
| `Result`           | 1B        | `result`      | `0xA1`="Success", `0xA0`="Failure". **Note:** V5008 uses Result byte (0xA1/0xA0), V6800 uses ctr_flag boolean. Both map to the same result field with values "Success"/"Failure". |
| `ColorCode`        | 1B        | -             | Used in `data` array as integer.                                                                                                                                                  |
| **Device Meta**    |           |               |                                                                                                                                                                                   |
| `Model`            | 2B        | `model`       | Hex String (Uppercase).                                                                                                                                                           |
| `Fw`               | 4B        | `fwVer`       | Binary field name: `Fw` → SIF JSON key: `fwVer`. `uint32_be` → String. Refer to Algorithm D                                                                                       |
| `IP`               | 4B        | `ip`          | Dot-notation String (e.g., "192.168.0.1").                                                                                                                                        |
| `Mask`             | 4B        | `mask`        | Dot-notation String.                                                                                                                                                              |
| `Gw`               | 4B        | `gwIp`        | Dot-notation String.                                                                                                                                                              |
| `Mac`              | 6B        | `mac`         | Hex String with colons (e.g., "AA:BB...").                                                                                                                                        |
| `OriginalReq`      | Var       | `originalReq` | Hex String. See Algorithm B.                                                                                                                                                      |

---

## 3. Special Parsing Algorithms

### Algorithm A: Signed Sensor Values (Temp/Hum)

_Used for fields: `temp`, `hum`. Binary Input: [IntegerByte, FractionByte]_

```jsx
function parseSignedFloat(integerByte, fractionByte) {
  // 1. Check Sign Bit (Two's Complement)
  let signedInt = integerByte & 0x80 ? (0xff - integerByte + 1) * -1 : integerByte;

  // 2. Combine with Fraction
  // Note: Fraction adds magnitude to the signed base
  let value = signedInt + Math.sign(signedInt || 1) * (fractionByte / 100);

  return Number(value.toFixed(2));
}
```

### Algorithm B: Dynamic `originalReq` Length

_Used for_ `QUERY_COLOR_RESP`_,_ `SET_COLOR_RESP`_,_ `CLEAR_ALARM_RESP`_._

```jsx
// Header (AA) is at index 0.
// Schema: Header(1) + DeviceId(4) + Result(1) + OriginalReq(var) + MsgId(4)

const resultByte = buffer[5]; // 0xA1=Success, 0xA0=Failure
const cmdCode = buffer[6]; // Command code: 0xE4, 0xE1, or 0xE2

let reqOffset;
let reqLength;

if (cmdCode === 0xe4) {
  // QUERY_COLOR_RESP: OriginalReq = [E4][ModAddr] (2 bytes)
  reqOffset = 6;
  reqLength = 2;
} else if (cmdCode === 0xe1 || cmdCode === 0xe2) {
  // SET_COLOR_RESP (0xE1) or CLEAR_ALARM_RESP (0xE2)
  reqOffset = 6;
  // Variable length: Total - Header(1) - DevId(4) - Result(1) - MsgId(4)
  reqLength = buffer.length - 10;
} else {
  throw new Error(`Unknown command code: 0x${cmdCode.toString(16).toUpperCase()}`);
}

// Extract OriginalReq
const reqBuffer = buffer.slice(reqOffset, reqOffset + reqLength);
const originalReq = reqBuffer.toString('hex').toUpperCase();

// Note: Schema overhead breakdown:
// - QUERY_COLOR_RESP: Header(1) + DevId(4) + Result(1) + OriginalReq(2) + ColorCodes(N) + MsgId(4) = 12 + N bytes total
// - SET_COLOR_RESP: Header(1) + DevId(4) + Result(1) + OriginalReq(var) + MsgId(4) = 10 + var bytes
// - CLEAR_ALARM_RESP: Header(1) + DevId(4) + Result(1) + OriginalReq(3) + MsgId(4) = 13 bytes total
```

### **Algorithm C: Parsing originalReq (Header AA)**

_Goal: Extract the Module Index from the echoed command._

```jsx
// 1. Determine Req Length and Offset (Algorithm B)
// 2. Extract Buffer slice for originalReq
const reqBuffer = buffer.slice(reqOffset, reqOffset + reqLength);

// 3. Extract Module Index (Byte 1 of the command)
// Example: E4 01 (Query Mod 1) -> 01
const moduleIndex = reqBuffer.readUInt8(1);

// 4. Return both the Hex String and the Index
return { originalReq: reqBuffer.toString('hex').toUpperCase(), moduleIndex };
```

**Note:** Module index is always at byte position 1 of the originalReq buffer, regardless of command type.

---

## 3.5 Data Type and Encoding Specifications

### 3.5.1 Timestamp Format

All timestamp fields (when present) MUST use the following ISO8601 format:

```
YYYY-MM-DDTHH:mm:ss.sssZ
```

**Examples:**

- `2026-02-25T10:30:00.000Z`
- `2026-02-25T10:30:45.123Z`

**Requirements:**

- Always include milliseconds (`.sss`)
- Always use UTC timezone (`Z` suffix)
- Do not use timezone offsets (e.g., `+08:00`)

### 3.5.2 Byte Order

**All multi-byte integer fields are Big-Endian.**

This includes:

- 2-byte fields: `Model`
- 4-byte fields: `DeviceId`, `MsgId`, `ModId`, `Fw`
- IP addresses (4 bytes, read as individual bytes then formatted)

**Note:** This is explicitly documented in Section 1.1 and applies consistently throughout the specification.

### 3.5.3 String Encoding

- **JSON strings (SIF):** UTF-8 encoding
- **Hex strings:** ASCII characters (0-9, A-F), uppercase
- **Device IDs:** String representation of the numeric value
- **MAC addresses:** Hex string with colons (e.g., `AA:BB:CC:DD:EE:FF`)
- **IP addresses:** Dot-notation string (e.g., `192.168.0.1`)

### 3.5.4 Empty Array vs Null Handling

**Rule:** Use explicit `null` for optional fields that have no value. Use empty array `[]` for successfully parsed data with no items.

**Examples:**

- Module has no RFID tags: `"data": []` (empty array)
- Single-door module has no second door: `"door2State": null` (explicit null)
- Parsing error or field not applicable: Omit field entirely or use `null`

**Specific Cases:**

- `door2State`: Always include as `null` for single-door modules
- Sensor data with `Addr === 0x00`: Skip that sensor entry (do not include in data array)
- Module with no sensors: `"data": []`

---

## 3.6 Error Handling

This section defines how the parser should handle various error conditions.

### 3.6.1 Binary Message Truncation

**Scenario:** Binary message is shorter than expected for the identified message type.

**Handling:**

- Log error with message type and expected vs actual length
- Discard the message (do not attempt partial parsing)
- Increment error counter for monitoring

**Example:**

```
ERROR: HEARTBEAT message truncated (expected 46 bytes, got 30 bytes)
```

### 3.6.2 Unknown Message Type

**Scenario:** Message cannot be identified using the parsing strategy (Section 1.1).

**Handling:**

- Log warning with first few bytes of the message for debugging
- Discard the message
- Do not attempt to parse further

**Example:**

```
WARN: Unknown message type, header bytes: 0xFF 0x00 0x01 0x02
```

### 3.6.3 ModuleIndex Out of Range

**Scenario:** `ModAddr` or `moduleIndex` is outside valid range (1-5 for V5008).

**Handling:**

- Log warning with device ID and invalid module index
- Skip that module entry (do not include in SIF data array)
- Continue processing other modules if applicable

**Example:**

```
WARN: Invalid moduleIndex 6 for device 2437871205 (valid range: 1-5)
```

### 3.6.4 Sensor Index Out of Range

**Scenario:** Sensor index (`Addr` or `uPos`) is outside valid range for the sensor type.

**Valid Ranges:**

- RFID sensors: 1-54
- Temperature sensors: 10-15
- Noise sensors: 16-18

**Handling:**

- Log warning with device ID, module index, and invalid sensor index
- Skip that sensor entry (do not include in SIF data array)
- Continue processing other sensors

**Example:**

```
WARN: Invalid sensorIndex 60 for TEMP_HUM (valid range: 10-15)
```

### 3.6.5 Sensor Index is 0x00

**Scenario:** Sensor index field is `0x00` (indicates no sensor data for that slot).

**Handling:**

- This is NOT an error - it's a valid indicator of an empty slot
- Skip that sensor entry (do not include in SIF data array)
- No logging required

**Example:** TEMP_HUM message has 6 slots, but only 3 have valid data (Addr ≠ 0x00).

### 3.6.6 Duplicate messageId

**Scenario:** Same messageId received multiple times from the same device.

**Handling:**

- Log info message with device ID and messageId
- Process the message normally (duplicate messages may be retransmissions)
- Application layer can implement deduplication if needed

**Example:**

```
INFO: Duplicate messageId 654367990 from device 2437871205
```

### 3.6.7 Invalid Checksum or CRC

**Scenario:** Message includes checksum/CRC that fails validation.

**Note:** V5008 binary protocol does not include explicit checksums in the documented format. If checksums are added in future:

**Handling:**

- Log error with device ID and checksum mismatch
- Discard the message
- Do not attempt to parse

### 3.6.8 Invalid Field Values

**Scenario:** Field value is outside expected range or format.

**Examples:**

- Temperature value > 100°C or < -50°C
- Humidity value > 100% or < 0%
- TagId with invalid hex characters

**Handling:**

- Log warning with device ID, field name, and invalid value
- Set field to `null` in SIF
- Continue processing other fields

**Example:**

```
WARN: Invalid temperature value 150.00°C for device 2437871205, setting to null
```

### 3.6.9 Buffer Overflow/Underflow

**Scenario:** Attempting to read beyond buffer boundaries during parsing.

**Handling:**

- Log critical error with message type and buffer position
- Discard the message immediately
- Do not attempt to recover

**Example:**

```
ERROR: Buffer overflow while parsing HEARTBEAT at position 50 (buffer length: 46)
```

### 3.6.10 Missing Required Fields

**Scenario:** Required field is missing from the binary message.

**Handling:**

- Log error with message type and missing field name
- Discard the message
- Do not attempt to create partial SIF

**Example:**

```
ERROR: Missing required field MsgId in HEARTBEAT message
```

### 3.6.11 Invalid Topic Format

**Scenario:** MQTT topic does not match expected pattern.

**Expected Patterns:**

- `V5008Upload/{deviceId}/OpeAck`
- `V5008Upload/{deviceId}/LabelState`
- `V5008Upload/{deviceId}/TemHum`
- `V5008Upload/{deviceId}/Noise`
- `V5008Download/{deviceId}`

**Handling:**

- Log warning with actual topic string
- Discard the message
- Do not attempt to parse

**Example:**

```
WARN: Invalid topic format: V5008Upload/2437871205/Unknown
```

### 3.6.12 Zero Value Handling for Sensor Data

**Scenario:** Raw binary value for Temperature, Humidity, or Noise is exactly `0x00` (Zero).

**Handling:**

- This is a documented rule (Section 3, "Data Validation Rule")
- Map the field to `null` in the SIF
- Do not output `0` as the value
- No logging required (this is expected behavior)

**Rationale:** A value of exactly 0x00 indicates no valid sensor reading, not a zero measurement.

---

### **Algorithm D: Parsing 4-byte field** to **String**

Read it as an **unsigned 32-bit integer in Big-Endian format** to get the same decimal value as Windows Calculator. For example, if buffer contains `27 00 DC F6`, it should return `654367990`. Use for  `ModId`, `MsgId` , `Fw`, `fwVer` .

```markdown
// Example: Raw message containing 4 bytes
const message = Buffer.from([0x27, 0x00, 0xDC, 0xF6]);

// Read as Unsigned 32-bit Integer, Big Endian (like Win 11 Calc)
const decimalValue = message.readUInt32BE(0).toString();

console.log(decimalValue); // Result: 654367990
```

### **Data Validation Rule:**

If the raw binary value for Temperature or Humidity is exactly 0x00 (Zero), map the field to null in the SIF. **Do not** output 0.

For Noise (4-byte IEEE 754 float), check if all 4 bytes are 0x00 (0.00), then map to null.

## 4. Message Structure Schemas (Binary Layout) and SIF

The parser must iterate through the binary buffer based on these structures to populate the SIF object.

### 4.1 `HEARTBEAT`

- **Topic:** `V5008Upload/{deviceId}/OpeAck`
- **Header:** `0xCC` or `0xCB`
- **Schema:** `Header(1)` + `[ModAddr(1) + ModId(4) + Total(1)] × 10` + `MsgId(4)`
- **Parsing Logic:** Loop 10 times. **Filter out** slots where `ModId == 0` or `ModAddr > 5`.
- **Spec from Raw → SIF**

```jsx
{
  "meta": { "topic": "...", "rawHex": "CC01..." },
  "deviceType": "V5008",
  "deviceId": "Topic[1]",
  "messageType": "HEARTBEAT",
  "messageId": "MsgId",
  "data": [{"moduleIndex": ModAddr , "moduleId": "ModId", "uTotal": Total }]
}

```

### 4.2 `RFID_SNAPSHOT`

- **Topic:** `V5008Upload/{deviceId}/LabelState`
- **Header:** `0xBB`
- **Schema:** `Header(1) + ModAddr(1) + ModId(4) + Res(1) + Total(1) + Count(1)` + `[uPos(1) + Alarm(1) + TagId(4)] × Count` + `MsgId(4)`
- **Spec from Raw → SIF**

```jsx
{
  "meta": { "topic": "...", "rawHex": "BB02..." },
  "deviceType": "V5008",
  "deviceId": "2437871205",
  "messageType": "RFID_SNAPSHOT",
  "messageId": "MsgId",
  "moduleIndex": ModAddr,
  "moduleId": "ModId",
  "data": [{ "sensorIndex": uPos, "isAlarm": false|true, "tagId": "DD344A44" }]
}

// Note:
// Fields discarded from raw to SIF:
//   - Res: Reserved byte not used in SIF (discarded by design)
//
// Field transformations:
//   - Topic[1] → deviceId
//   - MsgId → messageId
//   - ModAddr → moduleIndex
//   - ModId → moduleId
//   - Total → uTotal
//   - uPos → data[].sensorIndex
//   - TagId → data[].tagId
//
// isAlarm field creation logic:
//   - Alarm = 1 → isAlarm = true
//   - Alarm = 0 → isAlarm = false
```

### 4.3 `TEMP_HUM`

- **Topic:** `V5008Upload/{deviceId}/TemHum`
- **Header:** None (identified by topic suffix only)
- **Schema:** `ModAddr(1) + ModId(4)` + `[Addr(1) + T_Int(1) + T_Frac(1) + H_Int(1) + H_Frac(1)] × 6` + `MsgId(4)`
- **Note:** Fixed 6 slots. If `Addr === 0`, skip. Use Algorithm A for values.
- **Spec from Raw → SIF**

```jsx
{
  "meta": { "topic": "...", "rawHex": "01EC..." },
  "deviceType": "V5008",
  "deviceId": "Topic[1]",
  "messageType": "TEMP_HUM",
  "messageId": "MsgId",
  "moduleIndex": ModAddr,
  "moduleId": "ModId",
  "data": [{ "sensorIndex": Addr, "temp": xx.xx, "hum": xx.xx }]
}

// Note:
// Fields discarded from raw to SIF:
//   - Res: Reserved byte not used in SIF (discarded by design)
//
// Field transformations:
//   - Topic[1] → deviceId
//   - MsgId → messageId
//   - ModAddr → moduleIndex
//   - ModId → moduleId
//   - Addr → data[].sensorIndex
//
// Parsing logic:
//   - Fixed 6 slots
//   - If Addr === 0, skip (no sensor data)
//   - Use Algorithm A for T_Int/T_Frac and H_Int/H_Frac values
//
// Formatting:
//   - Format temp and hum to float "xx.xx" (Algorithm A)
```

### 4.4 `NOISE_LEVEL`

- **Topic:** `V5008Upload/{deviceId}/Noise`
- **Header:** None (identified by topic suffix only)
- **Schema:** `ModAddr(1) + ModId(4)` + `[Addr(1) + Noise(4)] × 3` + `MsgId(4)`
- **Total Size:** 24 bytes (1 + 4 + 15 + 4)
- **Note:** Fixed 3 slots. If `Addr === 0`, skip. **Noise is 4-byte big-endian float** (different from TEMP_HUM which uses Algorithm A with split Int+Frac fields).
- **Spec from Raw to SIF**

```jsx
{
  "meta": { "topic": "...", "rawHex": "01EC..." },
  "deviceType": "V5008",
  "deviceId": "Topic[1]",
  "messageType": "NOISE_LEVEL",
  "messageId": "MsgId",
  "moduleIndex": ModAddr,
  "moduleId": "ModId",
  "data": [{ "sensorIndex": Addr, "noise": xx.xx }]
}

// Note:
// Fields discarded from raw to SIF:
//   - Res: Reserved byte not used in SIF (discarded by design)
//
// Field transformations:
//   - Topic[1] → deviceId
//   - MsgId → messageId
//   - ModAddr → moduleIndex
//   - ModId → moduleId
//   - Addr → data[].sensorIndex
//
// Parsing logic:
//   - Fixed 3 slots
//   - If Addr === 0, skip (no sensor data)
//   - Parse Noise as 4-byte IEEE 754 big-endian float
//
// Formatting:
//   - Format noise to float "xx.xx"
```

### 4.5 `DOOR_STATE`

- **Topic:** `V5008Upload/{deviceId}/OpeAck`
- **Header:** `0xBA`
- **Schema:** `Header(1) + ModAddr(1) + ModId(4) + State(1) + MsgId(4)`
- **Spec from Raw to SIF**

```jsx
{
  "meta": { "topic": "...", "rawHex": "BA01..." },
  "deviceType": "V5008",
  "deviceId": "Topic[1]",
  "messageType": "DOOR_STATE",
  "messageId": "MsgId",
  "moduleIndex": ModAddr,
  "moduleId": "ModId",
  "door1State": State,
  "door2State": null
}

// Note:
// Fields discarded from raw to SIF:
//   - None (all fields are transformed)
//
// Field transformations:
//   - Topic[1] → deviceId
//   - MsgId → messageId
//   - ModAddr → moduleIndex (top level)
//   - ModId → moduleId (top level)
//   - State → door1State (top level)
//   - door2State is always null for V5008 (single door sensor)
//
// Note: Unlike V6800 which uses data[] array, V5008 DOOR_STATE has all door
// state fields at the top level since V5008 devices have only one door per message.
```

### 4.6 `DEVICE_INFO`

- **Topic:** `V5008Upload/{deviceId}/OpeAck`
- **Header:** `0xEF01`
- **Schema:** `Header(2) + Model(2) + Fw(4) + IP(4) + Mask(4) + Gw(4) + Mac(6) + MsgId(4)`
- **Spec from Raw to SIF**

```jsx
{
  "meta": { "topic": "...", "rawHex": "EF01..." },
  "deviceType": "V5008",
  "deviceId": "Topic[1]",
  "messageType": "DEVICE_INFO",
  "messageId": "MsgId",
  "fwVer": "Fw",//"2509101151",
  "ip": "IP",   //"192.168.0.211",
  "mask": "Mask",//"255.255.0.0",
  "gwIp": "Gw", //"192.168.0.1",
  "mac": "Mac", //"80:82:91:4E:F6:65"
}

// Note:
// Fields discarded from raw to SIF:
//   - None (all fields are used)
//
// Field transformations:
//   - Topic[1] → deviceId
//   - MsgId → messageId
//   - Fw → fwVer
//   - IP → ip
//   - Mask → mask
//   - Gw → gwIp
//   - Mac → mac
//
// Formatting:
//   - IP, Mask, Gw: Dot-notation String (e.g., "192.168.0.1")
//   - Mac: Hex String with colons (e.g., "AA:BB:CC...")
//   - Fw: Use Algorithm D to parse as String
```

### 4.7 `MODULE_INFO`

- **Topic:** `V5008Upload/{deviceId}/OpeAck`
- **Header:** `0xEF02`
- **Schema:** `Header(2)` + `[ModAddr(1) + Fw(4)] × N` + `MsgId(4)`
- **Logic:** `N = (Buffer.length - 6) / 5`
- **Spec from Raw to SIF**

```jsx
{
  "meta": { "topic": "...", "rawHex": "EF02..." },
  "deviceType": "V5008",
  "deviceId": "Topic[1]",
  "messageType": "MODULE_INFO",
  "messageId": "MsgId",
  "data": [{ "moduleIndex": ModAddr, "fwVer": "Fw" }]
}

// Note:
// Fields discarded from raw to SIF:
//   - None (all fields are used)
//
// Field transformations:
//   - Topic[1] → deviceId
//   - MsgId → messageId
//   - ModAddr → data[].moduleIndex
//   - Fw → data[].fwVer
//
// Parsing logic:
//   - N = (Buffer.length - 6) / 5 (number of module entries)
//   - Loop N times to extract module info
```

### 4.8 `QUERY_COLOR_RESP`

- **Topic:** `V5008Upload/{deviceId}/OpeAck`
- **Header:** `0xAA`
- **Schema:** `Header(1) + DeviceId(4) + Result(1) + OriginalReq(2) + [ColorCode × N] + MsgId(4)`
  - OriginalReq: `[E4]+[ModAddr]`
  - Payload: Color codes for all sensors (variable count N)
- **Logic:** `N = Buffer.length - 12` (number of color codes in payload)
- **Spec from Raw to SIF**

```json
{
  "meta": { "topic": "...", "rawHex": "AA..." },
  "deviceType": "V5008",
  "deviceId": "DeviceId",
  "messageType": "QUERY_COLOR_RESP",
  "messageId": "MsgId",
  "result": "Success"|"Failure",
  "originalReq": "OriginalReq",
  "moduleIndex": 1,
  "data": [0, 0, 0, 13, 13, 8]
}

// Note:
// Fields discarded from raw to SIF:
//   - None (all fields are used)
//
// Field transformations:
//   - DeviceId → deviceId
//   - MsgId → messageId
//   - OriginalReq → originalReq
//
// moduleIndex extraction logic:
//   - moduleIndex is extracted from byte 1 of originalReq hex string
//   - Example: originalReq = "E401" → moduleIndex = 0x01 = 1
//
// data array structure:
//   - data is a flat array of color codes (not objects)
//   - Each value is the color code for corresponding sensor position
//   - Count N = Buffer.length - 12
//
// result field creation logic:
//   - Result = 0xA1 → result = "Success"
//   - Result = 0xA0 → result = "Failure"
```

### 4.9 `SET_COLOR_RESP`

- **Topic:** `V5008Upload/{deviceId}/OpeAck`
- **Header:** `0xAA`
- **Schema:** `Header(1) + DeviceId(4) + Result(1) + OriginalReq(var) + MsgId(4)`
  - OriginalReq: `[E1]+[ModAddr] + (uIndex + colorCode) x N`
  - No additional payload (color codes are in originalReq)
- **Logic:** `var = Buffer.length - 10`, `N = (var - 2)/2` (number of sensor-color pairs in originalReq)
- **Spec from Raw to SIF**

```json
{
  "meta": { "topic": "...", "rawHex": "AA..." },
  "deviceType": "V5008",
  "deviceId": "DeviceId",
  "messageType": "SET_COLOR_RESP",
  "messageId": "MsgId",
  "result": "Success"|"Failure",
  "moduleIndex": 1,
  "originalReq": "E10105020601"
}

// Note:
// Fields discarded from raw to SIF:
//   - None (all fields are used)
//
// Field transformations:
//   - DeviceId → deviceId
//   - MsgId → messageId
//   - OriginalReq → originalReq
//
// moduleIndex extraction logic:
//   - moduleIndex is extracted from byte 1 of originalReq hex string
//   - Example: originalReq = "E101..." → moduleIndex = 0x01 = 1
//
// originalReq format breakdown:
//   - Format: [E1][ModAddr][uIndex1][colorCode1][uIndex2][colorCode2]...
//   - Example: "E10105020601" = E1 + 01 + 05 + 01 + 02 + 06 + 01
//     - E1: Command code
//     - 01: Module index
//     - 05: Sensor index 1
//     - 01: Color code for sensor 1
//     - 02: Sensor index 2
//     - 06: Color code for sensor 2
//     - 01: Color code for sensor 3 (if present)
//
// result field creation logic:
//   - Result = 0xA1 → result = "Success"
//   - Result = 0xA0 → result = "Failure"
```

### 4.10 `CLEAR_ALARM_RESP`

- **Topic:** `V5008Upload/{deviceId}/OpeAck`
- **Header:** `0xAA`
- **Schema:** `Header(1) + DeviceId(4) + Result(1) + OriginalReq(3) + MsgId(4)`
  - OriginalReq: `[E2]+[ModAddr]+[uIndex]`
  - No additional payload
- **Spec from Raw to SIF**

```json
{
  "meta": { "topic": "...", "rawHex": "AA..." },
  "deviceType": "V5008",
  "deviceId": "DeviceId",
  "messageType": "CLEAR_ALARM_RESP",
  "messageId": "MsgId",
  "result": "Success"|"Failure",
  "moduleIndex": 1,
  "originalReq": "E20106"
}

// Note:
// Fields discarded from raw to SIF:
//   - None (all fields are used)
//
// Field transformations:
//   - DeviceId → deviceId
//   - MsgId → messageId
//   - OriginalReq → originalReq
//
// moduleIndex extraction logic:
//   - moduleIndex is extracted from byte 1 of originalReq hex string
//   - Example: originalReq = "E201..." → moduleIndex = 0x01 = 1
//
// originalReq format:
//   - Format: [E2][ModAddr][uIndex]
//   - Example: "E20106" = E2 + 01 + 06
//     - E2: Command code
//     - 01: Module index
//     - 06: Sensor index (uIndex)
//
// result field creation logic:
//   - Result = 0xA1 → result = "Success"
//   - Result = 0xA0 → result = "Failure"
```

## 5. Query or Set Command Messages (App → Broker → Device)

### 5.1 `QUERY_DEVICE_INFO`

**Topic:** `V5008Download/{deviceId}`

**Message Format:**

```json
// Raw hex
[EF0100]

// SIF
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageType": "QUERY_DEVICE_INFO",
  "data": {}
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//   - data: Empty data object not sent in raw message
//
// Field transformations:
//   - deviceId → Not used (extracted from topic in middleware)
//   - messageType "QUERY_DEVICE_INFO" → msg_type "get_devies_init_req" (Note: msg_type not in spec, should be "get_device_info_req")
//   - msg_code = 200 (fixed value)
```

### 5.2 `QUERY_MODULE_INFO`

**Topic:** `V5008Download/{deviceId}`

**Message Format:**

```json
// Raw hex
[EF0200]

// SIF
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageType": "QUERY_MODULE_INFO",
  "data": {}
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//   - data: Empty data object not sent in raw message
//
// Field transformations:
//   - deviceId → Not used (extracted from topic in middleware)
//   - messageType "QUERY_MODULE_INFO" → msg_type "get_module_info_req" (Note: msg_type not in spec, should be "get_module_info_req")
//   - msg_code = 200 (fixed value)
```

### 5.3 `QUERY_RFID_SNAPSHOT`

**Topic:** `V5008Download/{deviceId}`

**Message Format:**

```json
// Raw format
[E901][moduleIndex]

// SIF
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageType": "QUERY_RFID_SNAPSHOT",
  "data": {"moduleIndex": 4}
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//   - data.sensorIndex: Not sent in raw message (only moduleIndex is sent)
//
// Field transformations:
//   - deviceId → Not used (extracted from topic in middleware)
//   - data.moduleIndex → [moduleIndex] (array format)
//   - messageType "QUERY_RFID_SNAPSHOT" → msg_type "u_state_req"
```

### 5.4 `QUERY_DOOR_STATE`

**Topic:** `V5008Download/{deviceId}`

**Message Format:**

```json
// Raw format
[E903][moduleIndex]

// SIF Format
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageType": "QUERY_DOOR_STATE",
  "data": {"moduleIndex": 4}
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//   - data.sensorIndex: Not sent in raw message (only moduleIndex is sent)
//
// Field transformations:
//   - deviceId → Not used (extracted from topic in middleware)
//   - data.moduleIndex → [moduleIndex] (array format)
//   - messageType "QUERY_DOOR_STATE" → msg_type "door_state_req"
```

### 5.5 `QUERY_TEMP_HUM`

**Topic:** `V5008Download/{deviceId}`

**Message Format:**

```json
// Raw format
[E902][moduleIndex]

// SIF format
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageType": "QUERY_TEMP_HUM",
  "data": {"moduleIndex": 4}
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//   - data.sensorIndex: Not sent in raw message (only moduleIndex is sent)
//
// Field transformations:
//   - deviceId → Not used (extracted from topic in middleware)
//   - data.moduleIndex → [moduleIndex] (array format)
//   - messageType "QUERY_TEMP_HUM" → msg_type "temper_humidity_req"
```

### 5.6 `SET_COLOR`

**Topic:** `V5008Download/{deviceId}`

**Message Format:**

```json
// Raw
[E1][01][0A01]

// SIF
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageType": "SET_COLOR",
  "payload": {
    "moduleIndex": 1,
    "sensorIndex": 10,
    "colorCode": 1
  }
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//   - data.sensorIndex: Not sent in raw message (mapped to u_index)
//
// Field transformations:
//   - deviceId → Not used (extracted from topic in middleware)
//   - data.moduleIndex → data[].host_gateway_port_index
//   - data.sensorIndex → data[].u_color_data[].u_index
//   - data.colorCode → data[].u_color_data[].color_code
//   - messageType "SET_COLOR" → msg_type "set_module_property_req"
//   - set_property_type = 8001 (fixed value)
//   - module_type = 2 (fixed value)
//   - extend_module_sn = null
```

### 5.7 `QUERY_COLOR`

**Topic:** `V5008Download/{deviceId}`

**Message Format:**

```json
// Raw format
[E4][moduleIndex]

// SIF format
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageType": "QUERY_COLOR",
  "data": {"moduleIndex": 4 }
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//   - data.sensorIndex: Not sent in raw message (only moduleIndex is sent)
//
// Field transformations:
//   - deviceId → Not used (extracted from topic in middleware)
//   - data.moduleIndex → [moduleIndex] (array format)
//   - messageType "QUERY_COLOR" → msg_type "get_u_color"
//   - code = 0 (default value, may vary)
```

### 5.8 `CLEAR_ALARM`

**Topic:** `V5008Download/{deviceId}`

**Message Format:**

```json
// Raw format
[E2][01][0A]

// SIF format
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageType": "CLEAR_ALARM",
  "data": {"moduleIndex": 1, "sensorIndex": 10}
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//
// Field transformations:
//   - deviceId → Not used (extracted from topic in middleware)
//   - data.moduleIndex → data[].index
//   - data.sensorIndex → data[].warning_data[0]
//   - messageType "CLEAR_ALARM" → msg_type "clear_u_warning"
//   - code = 0 (default value, may vary)
//   - data[].warning_data = [sensorIndex] (array format)
```
