"""Pont de test sur l’IP du conteneur ; CAB conserve son bind loopback."""
import asyncio
import socket
async def connection(reader,writer):
    target_reader,target_writer=await asyncio.open_connection('127.0.0.1',8790)
    async def relay(source,destination):
        try:
            while data:=await source.read(65536):destination.write(data);await destination.drain()
        finally:destination.close()
    await asyncio.gather(relay(reader,target_writer),relay(target_reader,writer))
async def main():
    server=await asyncio.start_server(connection,socket.gethostbyname(socket.gethostname()),8790)
    async with server:await server.serve_forever()
asyncio.run(main())
