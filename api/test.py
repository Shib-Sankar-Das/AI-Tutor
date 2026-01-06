"""
Minimal test API to verify Vercel Python functions work
"""

from fastapi import FastAPI

app = FastAPI()

@app.get("/api/test")
async def test():
    return {"status": "ok", "message": "Test endpoint working"}
