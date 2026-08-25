import os
import sqlite3
import pandas as pd
import requests

DB_PATH = "./data/enterprise_hr.db"
CSV_TARGET = "./data/real_hr_dataset.csv"

# A stable raw CSV source mirroring standard enterprise HR datasets
DATASET_URL = "https://raw.githubusercontent.com/pplonski/datasets-for-start/master/employee_attrition/HR-Employee-Attrition-All.csv"

def download_and_init_db():
    os.makedirs("./data", exist_ok=True)
    
    if not os.path.exists(CSV_TARGET):
        print(f"[Data] Downloading real-world HR dataset from public repository...")
        response = requests.get(DATASET_URL)
        if response.status_code == 200:
            with open(CSV_TARGET, "wb") as f:
                f.write(response.content)
            print(f"[Data] Successfully downloaded dataset to {CSV_TARGET}")
        else:
            raise RuntimeError(f"Failed to download dataset. Status code: {response.status_code}")

    # Read dataset and load into SQLite
    df = pd.read_csv(CSV_TARGET)
    
    # Normalize column names for safe SQL querying
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    
    # Generate a pseudo unique identifier column if not explicitly present
    if "employee_id" not in df.columns:
        df.insert(0, "employee_id", [f"EMP-{1000 + i}" for i in range(len(df))])

    conn = sqlite3.connect(DB_PATH)
    df.to_sql("employees", conn, if_exists="replace", index=False)
    conn.commit()
    conn.close()
    print(f"[Database] Loaded {len(df)} real employee records into SQLite at {DB_PATH}")

if __name__ == "__main__":
    download_and_init_db()