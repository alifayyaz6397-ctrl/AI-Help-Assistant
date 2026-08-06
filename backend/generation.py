import ollama
from embedding import create_embedding
from embedding import get_connection
import fastapi
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from google import genai
from dotenv import load_dotenv

load_dotenv();

def search_embedding(embedding):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
            """
            SELECT id, source_document, chunk_index, content,
               embedding <=> %s::vector AS distance
        FROM context_data
        ORDER BY distance
        LIMIT %s
        """,
    (embedding, 5)
    )
    rows = cur.fetchall()

    cur.close()
    conn.close()

    return  [
        {"id": r[0], "source": r[1], "chunk_index": r[2], "content": r[3], "distance": r[4]}
        for r in rows
    ]


def create_prompt(chunks, query, history):
    context = "\n\n".join(
        f"[Source: {c['source']}]\n{c['content']}"
        for c in chunks
    )

    history_text = ""
    if history:
        for h in history:
            history_text += f"{h['role']}: {h['content']}\n\n"

    prompt = f"""
    You are answering a question using ONLY the retrieved context below.
    If the context doesn't contain the answer, say so — do not use outside knowledge.
    The chat history is provided only for conversational continuity (e.g. resolving
    pronouns or follow-up references), not as a source of facts.

    Context:
    {context}

    Chat History:
    {history_text}

    Question:
    {query}
    """
    return prompt
    
def generate_ans(prompt: str):
    answer=ollama.chat(
        model="qwen2.5:7b",
        messages=[
        {"role": "user", "content": prompt}
        ],
        keep_alive="1h",
    )
    return answer["message"]["content"];
    # client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    # answer = client.models.generate_content(
    #     model="gemini-2.5-flash",
    #     contents=prompt
    # )
    # return answer.text
    
    
class QueryRequest(BaseModel):
    query: str
    history: list[dict[str,str]]=[]
    
    
app=fastapi.FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # your Vite dev server URL
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat")
def chat(request: QueryRequest):
    response=create_embedding(request.query)
    embedding=response.embeddings[0]
    chunks=search_embedding(embedding)
    prompt=create_prompt(chunks, request.query,request.history)
    print(prompt)
    answer=generate_ans(prompt)
    return {"answer": answer}
