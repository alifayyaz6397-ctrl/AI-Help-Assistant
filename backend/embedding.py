import ollama
import psycopg2
import os
import pdfplumber
from dotenv import load_dotenv
load_dotenv()
import tiktoken


def extract_pdf(path_file):
    if not os.path.exists(path_file):
        raise FileNotFoundError(f"File not found: {path_file}")
    if not path_file.lower().endswith(".pdf"):
        raise ValueError(f"File is not a PDF: {path_file}")
    if not os.path.isfile(path_file):
        raise ValueError(f"Path is not a file: {path_file}")
    with pdfplumber.open(path_file) as pdf:
        text=""
        for page in pdf.pages:
            text+=page.extract_text() or ""
    return {"text": text, "path_file": path_file}

def create_tokens(text):
    chunk=520
    overlap=20
    encoding=tiktoken.get_encoding("cl100k_base")
    tokens=encoding.encode(text)
    chunks=[]
    for i in range(0,len(tokens),chunk-overlap):
        chunk_token=tokens[i:i+chunk]
        chunks.append(encoding.decode(chunk_token))
    print(f"Total chunks: {len(chunks)}")
    return chunks

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def create_embedding(chunk: str):
    response=ollama.embed(
    model="nomic-embed-text",
    input=chunk
    )
    return response

def store_embedding(path_file: str,chunks: list):
    try:
        conn=get_connection()
        cur=conn.cursor()
        for i in range(len(chunks)):
            response=create_embedding(chunks[i])
            embedding=response.embeddings[0]
            print("starting to insert data into database")
            check=cur.execute("insert into context_data (source_document,chunk_index,content,embedding) values(%s,%s,%s,%s)", (path_file, i+1, chunks[i], embedding))
            print(f"inserting completed {check}")
        conn.commit()  
    finally:  
        cur.close();
        conn.close();
def main():
    path_file=input("enter path to PDF file: ")
    pdf_data=extract_pdf(path_file)
    chunks=create_tokens(pdf_data["text"])
    store_embedding(pdf_data["path_file"], chunks)
    print("Embedding created successfully")

if __name__=="__main__":
    main()