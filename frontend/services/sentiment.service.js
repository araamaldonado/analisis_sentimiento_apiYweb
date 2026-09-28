import axios from "axios";

const api = axios.create({baseURL: "http:localhost:8000"})

export async function apisentiment_fetch(texto){
    const res = await api.post("http://localhost:8000/api/sentiment", { texto })
    return res.data;
}