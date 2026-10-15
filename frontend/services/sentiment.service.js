import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" })

export async function apisentiment_batch_fetch(textos) {
    const res = await api.post("/api/sentiment/batch", { textos })
    return res.data.resultados; // Devuelve el array directo
}