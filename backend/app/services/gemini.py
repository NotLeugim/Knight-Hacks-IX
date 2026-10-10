import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load the variables from the .env file into the environment
load_dotenv()

# SPOTSight persona applied to all generation requests
SPOTSIGHT_CONFIG = types.GenerateContentConfig(
    system_instruction=(
        "You are SPOTSight, an expert AI diagnostic assistant for NextEra Energy plant operators. "
        "Do not use complex robotic jargon. "
        "You must explicitly cite the specific record IDs (e.g., M014) provided in the prompt "
        "to prevent hallucination."
    )
)


def get_client() -> genai.Client:
    """Return a Gemini client or raise a clear error if the API key is missing."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in the environment or .env file.")
    return genai.Client(api_key=api_key)


def upload_guide(file_path: str):
    """Upload a local PDF to the Gemini File API and return the file object."""
    client = get_client()
    uploaded_file = client.files.upload(file=file_path)
    return uploaded_file


async def test_gemini(prompt: str, uploaded_file=None) -> str:
    """Send a prompt (and optionally an uploaded file) to Gemini and return the response."""
    client = get_client()
    contents = [prompt]
    if uploaded_file is not None:
        contents.append(uploaded_file)

    response = await client.aio.models.generate_content(
        model="gemini-3.8-flash",
        contents=contents,
        config=SPOTSIGHT_CONFIG,
    )
    return response.text


async def analyze_anomaly(payload: dict, document_file) -> str:
    """Format a telemetry payload into a prompt and analyze it against a reference document."""
    client = get_client()
    prompt = (
        f"Mission ID: {payload['mission_id']}\n"
        f"Battery: {payload['battery_pct']}%\n"
        f"Failure Type: {payload['failure_type']}\n\n"
        "Using the uploaded reference document, diagnose this anomaly and recommend next steps. "
        "Cite the relevant record ID in your response."
    )

    response = await client.aio.models.generate_content(
        model="gemini-3.8-flash",
        contents=[prompt, document_file],
        config=SPOTSIGHT_CONFIG,
    )
    return response.text