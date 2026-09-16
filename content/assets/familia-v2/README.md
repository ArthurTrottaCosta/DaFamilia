# Fotografias ilustrativas — DaFamília, 16/09/2026

Geradas com a ferramenta integrada image_gen (modo de geração de imagens).
Pessoas fictícias; não representam clientes, familiares do titular ou depoimentos.
Originais preservados. O renderer aplica movimento e sobreposição tipográfica
via FFmpeg; não altera as fotografias com Pillow.

## Direção dos prompts

Formato vertical para filme social, fotografia natural e cinematográfica de uma
família brasileira, luz quente, casa acolhedora com objetos cotidianos, afeto
discreto, gestos espontâneos, textura de pele realista. Evitar aparência corporativa,
poses publicitárias, logos, marcas, texto legível e números de telefone.

- `01-memorias.png`: avó de cabelos grisalhos e filha adulta de blusa terracota
  sentadas à mesa, caderno antigo de contatos e celular; confiança transmitida
  entre gerações, café e plantas no ambiente.
- `02-confianca.png`: a mesma direção de família recebe à porta um eletricista
  conhecido há muitos anos; ele segura uma caixa de ferramentas, conversa e
  cumprimentos afetuosos, sem uniforme de marca ou endosso real.
- `03-geracoes.png`: avó e filha consultam juntas o celular e o caderno de
  contatos; mão no braço, carinho e continuidade do cuidado familiar.

## Produção

Briefing e falas: `content/reel-02-familia.json`.
Renderer: `scripts/render-family-reel.py` (Pillow, FFmpeg e edge-tts).
Voz sintética `pt-BR-FranciscaNeural`, sem clonagem. Texto genérico enviado ao
serviço de fala; nenhum contato real utilizado. Música sintetizada pelo renderer.
Referência técnica: https://github.com/rany2/edge-tts

Reprodução no checkout (usar diretório novo para cada revisão):

```powershell
python scripts/render-family-reel.py content/reel-02-familia.json --output artifacts/social/2026-09-16-v2-final
```

Entrega: `artifacts/social/2026-09-16-v2-final/confianca-que-fica-perto.mp4`.
Montagem de fotografias com movimento e narração; não é filmagem de pessoas reais.
Vídeo e legenda identificam o uso de IA e o estágio de preparação do aplicativo.
Estado: produzido para revisão, não publicado no Instagram.
