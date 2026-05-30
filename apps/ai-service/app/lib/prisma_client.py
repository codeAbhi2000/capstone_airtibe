"""
Prisma async client singleton.
Must call `connect()` / `disconnect()` in the FastAPI lifespan.
"""
from prisma import Prisma

prisma_client: Prisma = Prisma()
