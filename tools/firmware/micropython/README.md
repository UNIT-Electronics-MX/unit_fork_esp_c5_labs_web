# MicroPython files bundled with the web editor

The web editor reads its examples and installable drivers from the sibling
`esp-labs/examples/micropython/pulsar-c5/` checkout and its `manifest.json`.
The BMI270 ID, motion, cube, and driver files live there; edit them there so
the firmware checkout and the web editor show the same code.

`uart_loopback.py` is the only local override. It corrects the older checkout's
UART pin assignment to the Pulsar C5 pins used by this guide.
