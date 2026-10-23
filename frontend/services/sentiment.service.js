import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" })

export async function apisentiment_batch_fetch(textos) {
    const { data } = await api.post("/api/sentiment/batch", { textos })
    return data.resultados; // Devuelve el array directo
}