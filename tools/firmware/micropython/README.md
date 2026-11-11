# MicroPython files bundled with the web editor

`bmi270.py` is the MIT licensed driver from
[UNIT's MicroPython library collection](https://github.com/UNIT-Electronics-MX/unit_devlab_micropython_libraries/blob/main/software/bmi270/bmi270.py),
copied from Git blob `f1b2b699c70c899286915ea0b262859c5ea0757c`.
Its copyright and license notice remain in the file.

`bmi270_motion.py` is the Pulsar C5 follow-up to the firmware checkout's
`bmi270_id.py`: it uses QWIIC GPIO1/GPIO6 to show acceleration and gyro readings.
The build bundles these files when the D1 ID example is present.

The ST7735 display and showcase scripts, along with their driver, live in the
sibling `esp-labs/examples/micropython/pulsar-c5` checkout. The web build reads
them directly from its manifest and libraries directory; there are no local
ST7735 copies here. The driver exposes `TFTColor` and direct drawing methods.
Its source does not specify a license, so the editor does not label it MIT.
