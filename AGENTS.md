# DaFamília

Independent personal product. Never access or modify Nexus, Octopool or other tenants for this project.
Work in this checkout, not C:\Windows\System32\dafamilia (historical checkout).
Preserve remote data. New schema uses df_ tables; legacy tables are quarantined, not deleted. Never infer ownership from a shared family code or name.
All app queries require Supabase Auth and RLS. Demo data lives only in memory and is visibly identified.
Before deployment run npm run check and npm run test:security against isolated local Supabase. Never run security tests against production.
Do not claim production launch, account creation, notification delivery, payments or video publication without evidence.
