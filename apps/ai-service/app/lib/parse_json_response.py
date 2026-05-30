import json
import re

def parse_json_response(raw: str) -> dict:
    clean = re.sub(r"^```json|^```|```$", "", raw.strip(), flags=re.MULTILINE).strip()
    return json.loads(clean)


if __name__ == "__main__":
    # Quick test harness for the parsing function
    test_inputs = [
        '```json\n{"draft": "Hello world", "chips": ["Edit 1", "Edit 2"]}\n```',
        '```\n{"draft": "Hello world", "chips": ["Edit 1", "Edit 2"]}\n```',
        '{"draft": "Hello world", "chips": ["Edit 1", "Edit 2"]}',
        '```json\n{"draft": "Hello world"}\n```',
        '```json\nNot a JSON response\n```',
    ]

    for i, raw in enumerate(test_inputs, 1):
        print(f"Test case {i}:")
        try:
            result = parse_json_response(raw)
            print("Parsed result:", result)
        except Exception as exc:
            print("Error parsing:", exc)
        print("-" * 40)