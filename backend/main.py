from fastapi import FastAPI
from pydantic import BaseModel
from inference import analizar_sentimiento

app = FastAPI()

class TextoInput(BaseModel):
    texto: str

@app.post("/api/sentiment")
def sentiment_endpoint(datos: TextoInput):
    return analizar_sentimiento(datos.texto)