import argparse
import json
import subprocess
import sys

parser = argparse.ArgumentParser(description="remove a word")
parser.add_argument("--db", type=str, required=True)
parser.add_argument("--word", type=str, required=True)
args = parser.parse_args()

DB= args.db
WORD = args.word

def run_sqlite_query(query):
    command = """npx wrangler d1 execute {db} --command "{query}" --remote --json""".format(query=query, db=DB)
    result = subprocess.run(command, shell=True,
                            stdout = subprocess.PIPE,
                            text=True, check=True)
    return json.loads(result.stdout)[0]



query0 = "select * from words where word = '{word}'".format(word=WORD)
query0_results = run_sqlite_query(query0)
if len(query0_results['results']) == 0:
    print("Word is not in list. Aborting.")
    sys.exit(1)

query1 = "select * from defs_log where def like '% {word} %' or def like '{word} %' or def like '% {word}'".format(word=WORD)

query1_results = run_sqlite_query(query1)
if len(query1_results['results']) > 0:
    print("Word is already in use. Aborting.")
    sys.exit(1)

query2 = "select * from defs where word = '{word}'".format(word=WORD)
query2_results = run_sqlite_query(query2)
if len(query2_results['results']) > 0:
    print("Word is already defined. Aborting.")
    sys.exit(1)


query3 = "delete from words where word = '{word}'".format(word=WORD)
query3_results = run_sqlite_query(query3)
if not query3_results["success"]:
    print("Failed to delete word. Aborting.")
    sys.exit(1)

query4 = "UPDATE status SET total_num_words = total_num_words - 1";
query4_results = run_sqlite_query(query4)
if not query4_results["success"]:
    print("Failed to update word count. Aborting.")
    sys.exit(1)

print("success!")
print("To update the cached status on the homepage, visit /refresh-status as admin.")
