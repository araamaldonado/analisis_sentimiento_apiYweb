import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? "" })

export async function apisentiment_batch_fetch(textos, signal) {
    const { data } = await api.post("/api/sentiment/batch", { textos }, { signal })
    return data.resultados; // Devuelve el array directo
}