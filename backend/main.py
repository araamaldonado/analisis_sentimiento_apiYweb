from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from inference import analizar_sentimiento

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextoInput(BaseModel):
    texto: str

@app.post("/api/sentiment")
def sentiment_endpoint(datos: TextoInput):
    return analizar_sentimiento(datos.texto)