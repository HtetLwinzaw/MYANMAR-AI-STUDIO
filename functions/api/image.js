invoke_url='https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev'

authorization_header="Authorization: Bearer $NVIDIA_API_KEY"
accept_header='Accept: application/json'
content_type_header='Content-Type: application/json'

data='{
  "prompt": "photorealistic cinematic portrait of U Aung Zeya, the village headman of Moksobo, in his early 40s. His face is resolute, compassionate, and strong, with a traditional topknot (ဆံထုံး). He wears a high-quality, hand-woven traditional Burmese jacket (taik-pon) over a simple longyi. The lighting is soft, warm golden hour morning light, casting gentle shadows. The background is a soft-focus (shallow depth of field) glimpse of a traditional wooden village house. Epic film grain, 8k resolution, color-graded to a rich, earthy, and warm palette.",
  "mode": "canny",
  "image": "data:image/png;example_id,0",
  "cfg_scale": 3.5,
  "width": 1024,
  "height": 1024,
  "steps": 50
}'

response=$(curl --silent -i -w "\n%{http_code}" --request POST \
  --url "$invoke_url" \
  --header "$authorization_header" \
  --header "$accept_header" \
  --header "$content_type_header" \
  --data "$data"
)

http_code=$(echo "$response" | tail -n 1)

echo "$response" | awk '/{/,EOF-1'
