# IMU cube for Processing

A Processing 4 sketch that turns a 3D cube with the BMI270 on the Pulsar C5 (lesson D1).
It reads the same serial lines as the web IMU cube.

1. In the lab's code page (D1, MicroPython), install `bmi270.py` and run `bmi270_cube.py`.
   To keep it running after a reset, save `bmi270_cube.py` on the board as `main.py`:
   opening the port from Processing can reset the board.
2. Disconnect the serial terminal in the browser: only one program can open the port.
3. Open `imu_cube.pde` in Processing 4 and run it. Press `p` until the board's port is chosen.

| Key | Sends | The board answers |
| --- | ----- | ----------------- |
| `c` | `c`   | `ACK,c,bx,by,bz`: gyroscope bias measured again (keep the sensor still) |
| `z` | `z`   | `ACK,z`: the yaw is zero again |
| `p` | –     | opens the next serial port |

Line format, one per sample (50 per second):

```
IMU,roll,pitch,yaw,ax,ay,az,gx,gy,gz
```

Angles in degrees (yaw about sensor z, then pitch about y, then roll about x), acceleration in
m/s², angular velocity in °/s. Roll and pitch are corrected by gravity; yaw drifts slowly, so zero it
with `z`.

The HUD shows the received IMU rate and the drawing frame rate. With the current script, the IMU
rate should be close to 50 Hz; a lower rate points to the sensor or serial side, while a low drawing
rate points to Processing's graphics load.
