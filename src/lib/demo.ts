import type { FamilyData, Group } from "../types";
export const demoUser = "demo-ana";
export const demoGroup: Group = {
  id: "demo-group",
  name: "Família Oliveira",
  owner_id: demoUser,
  created_at: new Date().toISOString(),
};
export function demoData(): FamilyData {
  const now = new Date().toISOString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 30, 0, 0);
  return {
    members: [
      {
        group_id: demoGroup.id,
        user_id: demoUser,
        display_name: "Ana Oliveira",
        role: "owner",
      },
      {
        group_id: demoGroup.id,
        user_id: "demo-pedro",
        display_name: "Pedro Oliveira",
        role: "member",
      },
      {
        group_id: demoGroup.id,
        user_id: "demo-lucia",
        display_name: "Lúcia Oliveira",
        role: "member",
      },
    ],
    contacts: [
      {
        id: "demo-1",
        name: "Carlos Mendes",
        phone: "+5511999990001",
        category: "Casa",
        specialty: "Eletricista",
        recommended_by: "Lúcia",
        notes:
          "Exemplo: ajudou na reforma da cozinha. Combinar o horário antes de ligar.",
        pinned: true,
      },
      {
        id: "demo-2",
        name: "Mariana Costa",
        phone: "+5511999990002",
        category: "Saúde",
        specialty: "Pediatra",
        recommended_by: "Ana",
        notes: "Contato ilustrativo da demonstração.",
        pinned: true,
      },
      {
        id: "demo-3",
        name: "Oficina do Paulo",
        phone: "+5511999990003",
        category: "Serviços",
        specialty: "Mecânica automotiva",
        recommended_by: "Pedro",
        notes: "Exemplo: confirmar o orçamento antes do serviço.",
        pinned: false,
      },
      {
        id: "demo-4",
        name: "Bia & plantas",
        phone: "+5511999990004",
        category: "Casa",
        specialty: "Jardinagem",
        recommended_by: "Lúcia",
        notes: "Contato ilustrativo.",
        pinned: false,
      },
      {
        id: "demo-5",
        name: "Clínica Vet Amigo",
        phone: "+5511999990005",
        category: "Saúde",
        specialty: "Veterinário",
        recommended_by: "Ana",
        notes: "Contato ilustrativo.",
        pinned: false,
      },
      {
        id: "demo-6",
        name: "Tia Helena",
        phone: "+5511999990006",
        category: "Família",
        specialty: "Família",
        recommended_by: "Ana",
        notes: "Contato ilustrativo.",
        pinned: false,
      },
    ].map((c) => ({
      ...c,
      category: c.category as FamilyData["contacts"][number]["category"],
      group_id: demoGroup.id,
      created_by: demoUser,
      created_at: now,
      updated_at: now,
    })),
    appointments: [
      {
        id: "demo-event",
        group_id: demoGroup.id,
        title: "Revisão do carro",
        starts_at: tomorrow.toISOString(),
        contact_id: "demo-3",
        assigned_to: "demo-pedro",
        notes: "Exemplo de compromisso compartilhado.",
        created_by: demoUser,
      },
    ],
    interactions: [],
    nudges: [],
  };
}
