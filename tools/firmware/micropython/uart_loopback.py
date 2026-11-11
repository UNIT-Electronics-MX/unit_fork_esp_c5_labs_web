"""P6: loop UART1 between A2/GPIO4 and A3/GPIO5 on the Pulsar C5."""

from machine import Pin, UART


# Generic C5 MicroPython also uses UART0 for its REPL. Never bridge TX0 to RX0.
uart = UART(1, baudrate=115200, tx=Pin(4), rx=Pin(5), timeout=500)
print("P6 ready: bridge A2/GPIO4 to A3/GPIO5, then type a line")
try:
    while True:
        line = input("tx> ").strip()
        if not line:
            continue
        uart.write(line + "\n")
        response = uart.readline()
        if response is None:
            print("no response; check the jumper")
        else:
            print("loopback: {}".format(response.decode().strip()))
finally:
    uart.deinit()
