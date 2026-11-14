import json

with open(r'C:\Users\HP\.gemini\antigravity\brain\a2d3aea8-cfe9-491c-9b42-9d7a3c2c4ed8\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    user_inputs = []
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'USER_INPUT':
                user_inputs.append(data)
        except Exception:
            pass

print(f"Total USER_INPUTs: {len(user_inputs)}")
if user_inputs:
    last = user_inputs[-1]
    print("STEP INDEX:", last.get('step_index'))
    print("CREATED AT:", last.get('created_at'))
    print("CONTENT:")
    print(last.get('content'))
    print("MEDIA:")
    print(last.get('media'))
