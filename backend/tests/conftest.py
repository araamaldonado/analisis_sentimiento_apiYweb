import pytest

import inference


@pytest.fixture
def modelo_falso(monkeypatch):
    """Reemplaza al modelo por uno instantáneo: todo es 'Positivo' con 99 % de confianza."""

    def falso(textos, **kwargs):
        return [{"label": "POS", "score": 0.99} for _ in textos]

    monkeypatch.setattr(inference, "obtener_clasificador", lambda: falso)

@pytest.fixture(autouse=True)
def sin_limite_de_peticiones(monkeypatch):
    from main import limiter
    monkeypatch.setattr(limiter, "enabled", False)