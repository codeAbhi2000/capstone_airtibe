"""
FastAPI application — entrypoint.

Lifespan order:
  startup  → Prisma connect → RabbitMQ connect → start draft consumer (background task)
  shutdown → cancel consumer → RabbitMQ disconnect → Prisma disconnect
"""
import asyncio
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi import Request

from app.config.rabbitmq import connect as rmq_connect
from app.config.rabbitmq import disconnect as rmq_disconnect
from app.config.settings import get_settings
from app.message_que.draft_consumer import start_consumer
from app.routes.classify_route import router as classify_router
from app.routes.draft_route import router as draft_router
from app.routes.style_route import router as style_router
from app.lib.logger import get_logger
from app.lib.prisma_client import prisma_client

logger = get_logger(__name__)
settings = get_settings()

_consumer_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _consumer_task

    # ── Startup ──────────────────────────────────────────────────────────
    logger.info("startup_begin")

    await prisma_client.connect()
    logger.info("prisma_connected")

    await rmq_connect()

    _consumer_task = asyncio.create_task(start_consumer(), name="draft-consumer")
    logger.info("consumer_task_created")

    logger.info("startup_complete", host=settings.host, port=settings.port)

    yield  # ← app runs here

    # ── Shutdown ─────────────────────────────────────────────────────────
    logger.info("shutdown_begin")

    if _consumer_task and not _consumer_task.done():
        _consumer_task.cancel()
        try:
            await _consumer_task
        except asyncio.CancelledError:
            pass

    await rmq_disconnect()
    await prisma_client.disconnect()

    logger.info("shutdown_complete")



# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI Email Microservice",
    description=(
        "**POST /classify** — sync reply classifier  \n"
        "**POST /analyse-style** — build user writing style profile from sent emails  \n"
        f"**POST /drafts/{id}/rewrite** — rewrite/modify a draft with natural language  \n"
        "**draft.queue consumer** — async draft generator (RabbitMQ)"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("=== 422 VALIDATION ERROR ===")
    print("Body:", await request.body())
    print("Errors:", exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(await request.body())}
    )

app.include_router(classify_router)
app.include_router(style_router)
app.include_router(draft_router)


@app.get("/health", tags=["Health"], summary="Liveness check")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "service": "ai-email-microservice"})


# ---------------------------------------------------------------------------
# Dev entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower(),
        reload=False,
    )
