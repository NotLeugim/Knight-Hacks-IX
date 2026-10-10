from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import endpoints

app = FastAPI(
    title="SPOTSight Backend API",
    description="Processes SPOT robot mission data and surfaces insights for the NextEra Operator Dashboard.",
    version="0.1.0",
)

# Allow the Next.js dev server to call this API without CORS errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(endpoints.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to the SPOTSight NextEra Operator Dashboard API"}
