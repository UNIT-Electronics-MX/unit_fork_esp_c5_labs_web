# P4: panel de sensores integrados en Processing

Una ventana de Processing 4 muestra los cinco sensores de la Pulsar C5: FHT40, LPS22HB,
VCNL4040, MAX17048 y MMC5603. Al abrirse, presenta una escena 3D que cambia de
color con la temperatura, de brillo con la luz y de tamaño de anillos con la proximidad.
Los cinco valores aparecen a su lado. Pulsa `0` para ver la cuadrícula de datos,
`1`–`5` para ampliar un sensor y `V` o `Esc` para volver a la escena. `P` cambia
de puerto serie.
No hay cableado adicional: los sensores comparten el bus integrado GPIO2/GPIO3.

## Preparar la placa

1. Instala MicroPython en la Pulsar C5 y abre la lección **P4 → Código → MicroPython**.
2. Selecciona `p4_sensor_stream.py` e instala sus cinco controladores desde los botones
   **Instalar**: `fht40.py`, `lps22hb.py`, `vcnl4040.py`, `max1704x.py` y `mmc5603.py`.
   El script y los controladores viven en el repositorio hermano `esp-labs`.
3. Ejecuta el script. Deben aparecer líneas que empiezan por `P4,` en la consola.
4. En el campo de nombre del editor, escribe `main.py` y pulsa **Guardar**. Así el
   emisor vuelve a arrancar si Processing reinicia la placa al abrir el puerto.
5. Desconecta la consola serie del navegador. El puerto USB solo puede estar abierto
   en una aplicación a la vez.

## Abrir Processing

Abre `p4_sensor_lab.pde` en Processing 4 y pulsa **Run**. El sketch usa 115200 baudios
y abre el primer puerto de la lista. Si no es la placa, pulsa `P` para pasar al
siguiente; la consola de Processing muestra los nombres de los puertos.

El MAX17048 necesita una batería LiPo conectada para mostrar una lectura de carga
útil. El MMC5603 muestra cuentas crudas por eje: esos números no son un rumbo al
norte calibrado. Si un sensor no responde, su panel indica **Sin lectura** y los
demás continúan funcionando.

El segundo número de cada línea `P4,` es `mask`. Un valor `31` significa que los
cinco sensores tienen datos; `5` significa que solo responden FHT40 y VCNL4040.
Si el valor cambia de `31` a `5` después de unos segundos, mira los mensajes
`P4_WARN` que ahora aparecen cuando falla una lectura. Esos mensajes distinguen
entre un error I²C y la falta de muestras nuevas del magnetómetro.

## Protocolo serie

El script de la placa envía diez líneas por segundo, con este orden:

```text
P4,seq,mask,temp,rh,pressure,pressureTemp,lux,proximity,volts,soc,mx,my,mz
```

`temp` y `pressureTemp` están en °C; `rh` y `soc` en %; `pressure` en hPa;
`lux` en lux; `proximity` y los ejes magnéticos son cuentas crudas; `volts`
está en V. `mask` tiene los bits FHT40=1, LPS22HB=2, VCNL4040=4,
MAX17048=8 y MMC5603=16. Un valor `-` significa que aún no hay una lectura
válida. El receptor descarta líneas incompletas y deja de marcar datos como
actuales después de dos segundos sin recibir una muestra.
