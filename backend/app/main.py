import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Dual-Mode Kid-Friendly Agentic Discovery Engine powered by Groq LPU"
)

# Enable CORS for frontend Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all game routes
app.include_router(router)

@app.get("/api/health")
async def health_check():
    has_groq_key = bool(settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY"))
    return {
        "status": "healthy",
        "groq_enabled": has_groq_key,
        "modes": ["quest", "world"],
        "project": "SutraVesh"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
