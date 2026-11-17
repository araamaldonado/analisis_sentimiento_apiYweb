from typing import Annotated
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.concurrency import run_in_threadpool

from pydantic import BaseModel, Field, StringConstraints
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from inference import analizar_sentimientos_lote

limiter = Limiter(key_func=get_remote_address)

app = FastAPI()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
MAX_TEXTOS = 100
MAX_CHARS_TEXTO = 500

Texto = Annotated[str, StringConstraints(max_length=MAX_CHARS_TEXTO)]

class LoteInput(BaseModel):
    textos: list[Texto] = Field(min_length=1, max_length=MAX_TEXTOS)
    
TANDA = 16

@app.post("/api/sentiment/batch")
@limiter.limit("30/minute")
async def sentiment_batch_endpoint(datos: LoteInput, request: Request):
    resultados = []
    for i in range(0, len(datos.textos), TANDA):
        if await request.is_disconnected():
            return Response(status_code=499)  # el cliente canceló
        resultados += await run_in_threadpool(
            analizar_sentimientos_lote, datos.textos[i : i + TANDA]
        )
    return {"resultados": resultados}

DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if DIST.is_dir():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")