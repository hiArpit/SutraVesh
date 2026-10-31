import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.db import check_mongo_connection
from app.api.routes import router
from app.api.auth_routes import auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: check MongoDB connectivity
    await check_mongo_connection()
    yield
    # Shutdown logic (if any)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Dual-Mode Kid-Friendly Agentic Discovery Engine with Groq LPU, MongoDB & JWT Auth",
    lifespan=lifespan,
)

# Enable CORS for frontend Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all game & auth routes
app.include_router(auth_router)
app.include_router(router)


@app.get("/api/health")
async def health_check():
    has_groq_key = bool(settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY"))
    mongo_up = await check_mongo_connection()
    return {
        "status": "healthy",
        "groq_enabled": has_groq_key,
        "mongo_connected": mongo_up,
        "auth_enabled": True,
        "modes": ["quest", "world"],
        "project": "SutraVesh"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
