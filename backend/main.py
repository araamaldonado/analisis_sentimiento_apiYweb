from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from inference import analizar_sentimientos_lote

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoteInput(BaseModel):
    textos: list[str]

@app.post("/api/sentiment/batch")
def sentiment_batch_endpoint(datos: LoteInput):
    resultados = analizar_sentimientos_lote(datos.textos)
    return {"resultados": resultados}