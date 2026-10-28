from typing import Annotated

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, StringConstraints
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from inference import analizar_sentimientos_lote

limiter = Limiter(key_func=get_remote_address)

app = FastAPI()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cada texto: hasta 500 caracteres (el frontend ya corta en 465, esto es una red de seguridad)
Texto = Annotated[str, StringConstraints(max_length=500)]


class LoteInput(BaseModel):
    textos: list[Texto] = Field(min_length=1, max_length=100)

@app.post("/api/sentiment/batch")
@limiter.limit("30/minute")
def sentiment_batch_endpoint(request: Request, datos: LoteInput):
    return {"resultados": analizar_sentimientos_lote(datos.textos)}