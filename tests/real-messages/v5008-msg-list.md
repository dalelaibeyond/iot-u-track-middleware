# V5008 Real Test Messages

This file contains real V5008 device messages for end-to-end testing.
Each test case includes the raw binary input (hex representation) and expected SIF/SUO outputs.

---

## Test Case 1: DEVICE_INFO

**Description:** Device information response with network configuration
**Topic:** V5008Upload/2437871205/OpeAck

### Raw Input (Hex)

```
EF011390958DD85FC0A800D3FFFF0000C0A800018082914EF665F2011CCB
```

### Raw Input (Binary Breakdown)

| Field  | Bytes | Value        | Description                     |
| ------ | ----- | ------------ | ------------------------------- |
| Header | 0-1   | EF01         | DEVICE_INFO header              |
| Model  | 2-3   | 1390         | Device model (hex)              |
| FwVer  | 4-7   | 958DD85F     | Firmware version = "2509101151" |
| IP     | 8-11  | C0A800D3     | 192.168.0.211                   |
| Mask   | 12-15 | FFFF0000     | 255.255.0.0                     |
| GwIp   | 16-19 | C0A80001     | 192.168.0.1                     |
| Mac    | 20-25 | 8082914EF665 | 80:82:91:4E:F6:65               |
| MsgId  | 26-29 | F2011CCB     | Message ID = "4060159179"       |

### Expected SIF Output

```json
{
  "meta": {},
  "deviceType": "V5008",
  "deviceId": "2437871205",
  "messageType": "DEVICE_INFO",
  "messageId": "4060159179",
  "fwVer": "2509101151",
  "ip": "192.168.0.211",
  "mask": "255.255.0.0",
  "gwIp": "192.168.0.1",
  "mac": "80:82:91:4E:F6:65",
  "model": "1390"
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_DEV_MOD",
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageId": "4060159179",
  "ip": "192.168.0.211",
  "mask": "255.255.0.0",
  "gwIp": "192.168.0.1",
  "mac": "80:82:91:4E:F6:65",
  "model": "1390",
  "fwVer": "2509101151",
  "modules": []
}
```

---

## Test Case 2: MODULE_INFO

**Description:** Module firmware information for 2 modules
**Topic:** V5008Upload/2437871205/OpeAck

### Raw Input (Hex)

```
EF0201898393CC02898393CCF4010166
```

### Raw Input (Binary Breakdown)

| Field   | Bytes | Value    | Description                     |
| ------- | ----- | -------- | ------------------------------- |
| Header  | 0-1   | EF02     | MODULE_INFO header              |
| ModAddr | 2     | 01       | Module address 1                |
| FwVer   | 3-6   | 898393CC | Firmware version = "2303139852" |
| ModAddr | 7     | 02       | Module address 2                |
| FwVer   | 8-11  | 898393CC | Firmware version = "2303139852" |
| MsgId   | 12-15 | F4010166 | Message ID = "4093642086"       |

### Expected SIF Output

```json
{
  "meta": {},
  "deviceType": "V5008",
  "deviceId": "2437871205",
  "messageType": "MODULE_INFO",
  "messageId": "4093706598",
  "data": [
    { "moduleIndex": 1, "fwVer": "2307101644" },
    { "moduleIndex": 2, "fwVer": "2307101644" }
  ]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_DEV_MOD",
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageId": "4093706598",
  "ip": null,
  "mask": null,
  "gwIp": null,
  "mac": null,
  "model": null,
  "fwVer": null,
  "modules": [
    { "moduleIndex": 1, "moduleId": "", "fwVer": "2307101644", "uTotal": 0 },
    { "moduleIndex": 2, "moduleId": "", "fwVer": "2307101644", "uTotal": 0 }
  ]
}
```

---

## Test Case 3: HEARTBEAT

**Description:** Device heartbeat with 2 active modules (slots 1 and 2)
**Topic:** V5008Upload/2437871205/OpeAck

### Raw Input (Hex)

```
CC01EC3737BF06028C0909950C0300000000000400000000000500000000000600000000000700000000000800000000000900000000000A0000000000F200168F
```

### Raw Input (Binary Breakdown)

| Field        | Bytes | Value    | Description               |
| ------------ | ----- | -------- | ------------------------- |
| Header       | 0     | CC       | HEARTBEAT header          |
| ModAddr 1    | 1     | 01       | Module address 1          |
| ModId 1      | 2-5   | EC3737BF | Module ID = "3961559999"  |
| Total 1      | 6     | 06       | 6 slots                   |
| ModAddr 2    | 7     | 02       | Module address 2          |
| ModId 2      | 8-11  | 8C090995 | Module ID = "2352741781"  |
| Total 2      | 12    | 0C       | 12 slots                  |
| ModAddr 3-10 | 13-60 | 00...    | Empty modules             |
| MsgId        | 61-64 | F200168F | Message ID = "4064414351" |

### Expected SIF Output

```json
{
  "meta": {},
  "deviceType": "V5008",
  "deviceId": "2437871205",
  "messageType": "HEARTBEAT",
  "messageId": "4060092047",
  "data": [
    { "moduleIndex": 1, "moduleId": "3963041727", "uTotal": 6 },
    { "moduleIndex": 2, "moduleId": "2349402517", "uTotal": 12 }
  ]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_HEARTBEAT",
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageId": "4060092047",
  "meta": { "busVoltage": null, "busCurrent": null, "mainPower": null, "backupPower": null },
  "modules": [
    { "moduleIndex": 1, "moduleId": "3963041727", "uTotal": 6 },
    { "moduleIndex": 2, "moduleId": "2349402517", "uTotal": 12 }
  ]
}
```

---

## Test Case 4: DOOR_STATE

**Description:** Single door state - door 1 is open
**Topic:** V5008Upload/2437871205/OpeAck

### Raw Input (Hex)

```
BA01EC3737BF010B01C7F8
```

### Raw Input (Binary Breakdown)

| Field   | Bytes | Value    | Description                    |
| ------- | ----- | -------- | ------------------------------ |
| Header  | 0     | BA       | DOOR_STATE header              |
| ModAddr | 1     | 01       | Module address 1               |
| ModId   | 2-5   | EC3737BF | Module ID = "3961559999"       |
| State   | 6     | 01       | Door 1 open (0=closed, 1=open) |
| MsgId   | 7-10  | 0B01C7F8 | Message ID = "184558584"       |

### Expected SIF Output

```json
{
  "meta": {},
  "deviceType": "V5008",
  "deviceId": "2437871205",
  "messageType": "DOOR_STATE",
  "messageId": "184666104",
  "moduleIndex": 1,
  "moduleId": "3963041727",
  "door1State": 1,
  "door2State": null
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_DOOR_STATE",
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "moduleIndex": 1,
  "moduleId": "3963041727",
  "messageId": "184666104",
  "door1State": 1,
  "door2State": null,
  "data": {}
}
```

---

## Test Case 5: RFID_SNAPSHOT

**Description:** RFID snapshot with 3 tags detected
**Topic:** V5008Upload/2437871205/LabelState

### Raw Input (Hex)

```
BB01EC3737BF000C030100DD344A440200DD2862B40300DD3CE9C4050007AA
```

### Raw Input (Binary Breakdown)

| Field   | Bytes | Value          | Description                       |
| ------- | ----- | -------------- | --------------------------------- |
| Header  | 0     | BB             | RFID_SNAPSHOT header              |
| ModAddr | 1     | 01             | Module address 1                  |
| ModId   | 2-5   | EC3737BF       | Module ID = "3961559999"          |
| Res     | 6     | 00             | Reserved                          |
| Total   | 7     | 0C             | 12 slots total                    |
| Count   | 8     | 03             | 3 tags detected                   |
| Tag 1   | 9-14  | 01 00 DD344A44 | uPos=1, Alarm=0, TagId="DD344A44" |
| Tag 2   | 15-20 | 02 00 DD2862B4 | uPos=2, Alarm=0, TagId="DD2862B4" |
| Tag 3   | 21-26 | 03 00 DD3CE9C4 | uPos=3, Alarm=0, TagId="DD3CE9C4" |
| MsgId   | 27-30 | 050007AA       | Message ID = "83889194"           |

### Expected SIF Output

```json
{
  "meta": {},
  "deviceType": "V5008",
  "deviceId": "2437871205",
  "messageType": "RFID_SNAPSHOT",
  "messageId": "83888042",
  "moduleIndex": 1,
  "moduleId": "3963041727",
  "uTotal": 12,
  "data": [
    { "sensorIndex": 1, "isAlarm": false, "tagId": "DD344A44" },
    { "sensorIndex": 2, "isAlarm": false, "tagId": "DD2862B4" },
    { "sensorIndex": 3, "isAlarm": false, "tagId": "DD3CE9C4" }
  ]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_RFID_SNAPSHOT",
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "moduleIndex": 1,
  "moduleId": "3963041727",
  "messageId": "83888042",
  "data": {
    "sensors": [
      { "sensorIndex": 1, "tagId": "DD344A44", "isAlarm": false },
      { "sensorIndex": 2, "tagId": "DD2862B4", "isAlarm": false },
      { "sensorIndex": 3, "tagId": "DD3CE9C4", "isAlarm": false }
    ]
  }
}
```

---

## Test Case 6: TEMP_HUM

**Description:** Temperature and humidity readings from 2 sensors
**Topic:** V5008Upload/2437871205/TemHum

### Raw Input (Hex)

```
01EC3737BF0A2C30431B0B2C08540B0C000000000D000000000E000000000F0000000001012CC3
```

### Raw Input (Binary Breakdown)

| Field       | Bytes | Value          | Description                       |
| ----------- | ----- | -------------- | --------------------------------- |
| ModAddr     | 0     | 01             | Module address 1                  |
| ModId       | 1-4   | EC3737BF       | Module ID = "3961559999"          |
| Sensor A    | 5-9   | 0A 2C 30 43 1B | Addr=10, Temp=44.48°C, Hum=67.27% |
| Sensor B    | 10-14 | 0B 2C 08 54 0B | Addr=11, Temp=44.08°C, Hum=84.11% |
| Sensors C-F | 15-29 | 00...          | No sensors                        |
| MsgId       | 30-33 | 01012CC3       | Message ID = "16890307"           |

**Temperature/Humidity Calculation (Signed Float Algorithm A):**

- Sensor A (Addr 10): T_Int=2C(44), T_Frac=30(48) → 44.48°C; H_Int=43(67), H_Frac=1B(27) → 67.27%
- Sensor B (Addr 11): T_Int=2C(44), T_Frac=08(8) → 44.08°C; H_Int=54(84), H_Frac=0B(11) → 84.11%

### Expected SIF Output

```json
{
  "meta": {},
  "deviceType": "V5008",
  "deviceId": "2437871205",
  "messageType": "TEMP_HUM",
  "messageId": "16854211",
  "moduleIndex": 1,
  "moduleId": "3963041727",
  "data": [
    { "sensorIndex": 10, "temp": 44.48, "hum": 67.27 },
    { "sensorIndex": 11, "temp": 44.08, "hum": 84.11 },
    { "sensorIndex": 12, "temp": 0, "hum": 0 },
    { "sensorIndex": 13, "temp": 0, "hum": 0 },
    { "sensorIndex": 14, "temp": 0, "hum": 0 },
    { "sensorIndex": 15, "temp": 0, "hum": 0 }
  ]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_TEMP_HUM",
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "moduleIndex": 1,
  "moduleId": "3963041727",
  "messageId": "16854211",
  "data": {
    "sensors": [
      { "sensorIndex": 10, "temp": 44.48, "hum": 67.27 },
      { "sensorIndex": 11, "temp": 44.08, "hum": 84.11 },
      { "sensorIndex": 12, "temp": 0, "hum": 0 },
      { "sensorIndex": 13, "temp": 0, "hum": 0 },
      { "sensorIndex": 14, "temp": 0, "hum": 0 },
      { "sensorIndex": 15, "temp": 0, "hum": 0 }
    ]
  }
}
```

---

## Test Case 7: NOISE_LEVEL

**Description:** Noise level readings from 3 sensors
**Topic:** V5008Upload/2437871205/Noise

### Raw Input (Hex)

```
01EC3737BF100002001011000030201200020030D500EBD7
```

### Raw Input (Binary Breakdown)

| Field    | Bytes | Value       | Description                        |
| -------- | ----- | ----------- | ---------------------------------- |
| ModAddr  | 0     | 01          | Module address 1                   |
| ModId    | 1-4   | EC3737BF    | Module ID = "3963041727"           |
| Sensor 1 | 5-9   | 10 00020010 | Addr=16, Noise=0.00 (4-byte float) |
| Sensor 2 | 10-14 | 11 00003020 | Addr=17, Noise=0.00 (4-byte float) |
| Sensor 3 | 15-19 | 12 00020030 | Addr=18, Noise=0.00 (4-byte float) |
| MsgId    | 20-23 | D500EBD7    | Message ID = "3573607383"          |

**Note:** NOISE_LEVEL uses 4-byte big-endian float (IEEE 754) for noise values, different from TEMP_HUM which uses Algorithm A with 1-byte Int+Frac split.

### Expected SIF Output

```json
{
  "meta": {},
  "deviceType": "V5008",
  "deviceId": "2437871205",
  "messageType": "NOISE_LEVEL",
  "messageId": "3573607383",
  "moduleIndex": 1,
  "moduleId": "3963041727",
  "data": [
    { "sensorIndex": 16, "noise": 0 },
    { "sensorIndex": 17, "noise": 0 },
    { "sensorIndex": 18, "noise": 0 }
  ]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_NOISE_LEVEL",
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "moduleIndex": 1,
  "moduleId": "3963041727",
  "messageId": "3573607383",
  "data": {
    "sensors": [
      { "sensorIndex": 16, "noise": 0 },
      { "sensorIndex": 17, "noise": 0 },
      { "sensorIndex": 18, "noise": 0 }
    ]
  }
}
```

---

## Test Case 8: QUERY_COLOR_RESP

**Description:** Query color response with color codes for 13 slots
**Topic:** V5008Upload/2437871205/OpeAck

### Raw Input (Hex)

```
AA914EF665A1E4010000000D0D0825015D4C
```

### Raw Input (Binary Breakdown)

| Field       | Bytes | Value           | Description                   |
| ----------- | ----- | --------------- | ----------------------------- |
| Header      | 0     | AA              | Command response header       |
| DeviceId    | 1-4   | 914EF665        | Device ID = "2437871205"      |
| Res         | 5     | A1              | Reserved / command category   |
| CmdCode     | 6     | E4              | QUERY_COLOR_RESP command code |
| ModAddr     | 7     | 01              | Module address 1              |
| Total       | 8     | 00              | Reserved                      |
| Reserved    | 9-10  | 000D            | Reserved bytes                |
| Count       | 11    | 0D              | 13 color codes (0D = 13)      |
| Color Codes | 12-24 | 0D0825015D4C... | 13 color code bytes           |
| MsgId       | 25-28 | (embedded)      | Part of color codes           |

**Note:** This response contains 13 color codes (one byte per slot). The color codes include: 0D, 08, 25, 01, 5D, 4C, etc.

### Expected SIF Output

```json
{
  "meta": {},
  "deviceType": "V5008",
  "deviceId": "2437871205",
  "messageType": "QUERY_COLOR_RESP",
  "messageId": "620846412",
  "result": "Success",
  "originalReq": "E401",
  "moduleIndex": 1,
  "data": [0, 0, 0, 13, 13, 8]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_COMMAND_RESULT",
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "moduleIndex": 1,
  "moduleId": "",
  "messageId": "620846412",
  "data": {
    "commandType": "QUERY_COLOR",
    "result": "Success",
    "originalReq": "E401",
    "colorCodes": [0, 0, 0, 13, 13, 8]
  }
}
```

---

## Test Case 9: SET_COLOR_RESP

**Description:** Set color command response - success
**Topic:** V5008Upload/2437871205/OpeAck

### Raw Input (Hex)

```
AA914EF665A1E101050206012B002316
```

### Raw Input (Binary Breakdown)

| Field    | Bytes | Value    | Description                 |
| -------- | ----- | -------- | --------------------------- |
| Header   | 0     | AA       | Command response header     |
| DeviceId | 1-4   | 914EF665 | Device ID = "2437871205"    |
| Res      | 5     | A1       | Reserved                    |
| CmdCode  | 6     | E1       | SET_COLOR_RESP command code |
| ModAddr  | 7     | 01       | Module address 1            |
| Count    | 8     | 05       | 5 slots updated             |
| Result   | 9     | 02       | Result code                 |
| Action   | 10    | 06       | Action type                 |
| Color    | 11    | 01       | Color code applied          |
| MsgId    | 12-15 | 2B002316 | Message ID = "721421078"    |

### Expected SIF Output

```json
{
  "meta": {},
  "deviceType": "V5008",
  "deviceId": "2437871205",
  "messageType": "SET_COLOR_RESP",
  "messageId": "721429270",
  "result": "Success",
  "originalReq": "E10105020601",
  "moduleIndex": 1
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_COMMAND_RESULT",
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "moduleIndex": 1,
  "moduleId": "",
  "messageId": "721429270",
  "data": {
    "commandType": "SET_COLOR",
    "result": "Success",
    "originalReq": "E10105020601"
  }
}
```

---

## Test Case 10: CLEAR_ALARM_RESP

**Description:** Clear alarm command response - success
**Topic:** V5008Upload/2437871205/OpeAck

### Raw Input (Hex)

```
AA914EF665A1E20106AC009ECF
```

### Raw Input (Binary Breakdown)

| Field     | Bytes | Value    | Description                      |
| --------- | ----- | -------- | -------------------------------- |
| Header    | 0     | AA       | Command response header          |
| DeviceId  | 1-4   | 914EF665 | Device ID = "2437871205"         |
| Res       | 5     | A1       | Reserved                         |
| CmdCode   | 6     | E2       | CLEAR_ALARM_RESP command code    |
| ModAddr   | 7     | 01       | Module address 1                 |
| SensorIdx | 8     | 06       | Sensor index 6 cleared           |
| Result    | 9     | AC       | Result code (AC = 172 = success) |
| MsgId     | 10-13 | 009ECF   | Message ID = "40655"             |

### Expected SIF Output

```json
{
  "meta": {},
  "deviceType": "V5008",
  "deviceId": "2437871205",
  "messageType": "CLEAR_ALARM_RESP",
  "messageId": "2885721807",
  "result": "Success",
  "originalReq": "E20106",
  "moduleIndex": 1
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_COMMAND_RESULT",
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "moduleIndex": 1,
  "moduleId": "",
  "messageId": "2885721807",
  "data": {
    "commandType": "CLEAR_ALARM",
    "result": "Success",
    "originalReq": "E20106"
  }
}
```

---

## Summary

| Test # | Message Type     | Topic      | Key Validation Points              |
| ------ | ---------------- | ---------- | ---------------------------------- |
| 1      | DEVICE_INFO      | OpeAck     | IP, MAC, firmware parsing          |
| 2      | MODULE_INFO      | OpeAck     | Module list with firmware versions |
| 3      | HEARTBEAT        | OpeAck     | Multiple modules, filtering logic  |
| 4      | DOOR_STATE       | OpeAck     | Single door state (open)           |
| 5      | RFID_SNAPSHOT    | LabelState | Tag list with alarm states         |
| 6      | TEMP_HUM         | TemHum     | Signed float parsing for temp/hum  |
| 7      | NOISE_LEVEL      | Noise      | Signed float parsing for noise     |
| 8      | QUERY_COLOR_RESP | OpeAck     | Command response with color array  |
| 9      | SET_COLOR_RESP   | OpeAck     | Simple command response            |
| 10     | CLEAR_ALARM_RESP | OpeAck     | Command response with sensor index |

## Notes for Test Implementation

1. **Binary Input**: The `rawHex` field in tests should be converted to Buffer before parsing
2. **Timestamps**: SUO messages include `serverTimestamp` and `deviceTimestamp` fields (ISO8601 format)
3. **Meta Field**: SIF messages include a `meta` field with `topic` and `rawHex`
4. **Command Responses**: May have deviceId duplicated in both outer message and data.originalReq
5. **Signed Float Algorithm**: Used for temp, hum, and noise values (Algorithm A from V5008 spec)
