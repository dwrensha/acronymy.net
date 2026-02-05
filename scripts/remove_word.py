import argparse
import json
import subprocess
import sys

parser = argparse.ArgumentParser(description="remove a word")
parser.add_argument("--env", type=str, required=True)
parser.add_argument("--word", type=str, required=True)
args = parser.parse_args()

ENV = args.env
if ENV == 'prod':
    DB = 'acronymy-prod'
elif ENV == 'dev':
    DB = 'acronymy-dev'
else:
    print("unknown env ", ENV)
    sys.exit(1)
WORD = args.word

def run_sqlite_query(query):
    command = """npx wrangler d1 execute {db} --command "{query}" --remote --json""".format(query=query, db=DB)
    result = subprocess.run(command, shell=True,
                            stdout = subprocess.PIPE,
                            text=True, check=True)
    return json.loads(result.stdout)[0]

print("checking whether word exists...")
query0 = "select rowid from words where word = '{word}'".format(word=WORD)
query0_results = run_sqlite_query(query0)
if len(query0_results['results']) == 0:
    print("Word is not in list. Aborting.")
    sys.exit(1)


print("checking whether any definition uses the word...")
query1 = "select * from defs_log where def like '% {word} %' or def like '{word} %' or def like '% {word}'".format(word=WORD)

query1_results = run_sqlite_query(query1)
if len(query1_results['results']) > 0:
    print("Word is already in use. Aborting.")
    sys.exit(1)

print("checking whether the word is defined...")
query2 = "select * from defs where word = '{word}'".format(word=WORD)
query2_results = run_sqlite_query(query2)
if len(query2_results['results']) > 0:
    print("word is already defined. clearing out existing defs...")


    query30 = "delete from defs_log where word = '{word}'".format(word=WORD)
    query30_results = run_sqlite_query(query30)
    if not query30_results["success"]:
        print("Failed to delete word defs_log. Aborting.")
        sys.exit(1)

    query31 = "delete from defs where word = '{word}'".format(word=WORD)
    query31_results = run_sqlite_query(query31)
    if not query31_results["success"]:
        print("Failed to delete word defs. Aborting.")
        sys.exit(1)

print("deleting the word...")
query3 = "delete from words where word = '{word}'".format(word=WORD)
query3_results = run_sqlite_query(query3)
if not query3_results["success"]:
    print("Failed to delete word. Aborting.")
    sys.exit(1)

print("updating status.total_num_words...")
query4 = "UPDATE status SET total_num_words = total_num_words - 1";
query4_results = run_sqlite_query(query4)
if not query4_results["success"]:
    print("Failed to update word count. Aborting.")
    sys.exit(1)


print("clearing cached homepage status...")
preview = "--preview false"
if ENV == "dev":
    preview = "--preview true"

command = """npx wrangler -e {env} kv key delete status --binding META {preview} --remote""".format(env=ENV, word=WORD, preview=preview)
subprocess.run(command, shell=True, text=True, check=True)

print("success!")
