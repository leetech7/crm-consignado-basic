# Cadastro do cliente mais compacto (menos rolagem)

## O que muda
- Os campos de valores (Compra de dívida, Margem disponível, Margem RCC, Margem RMC, Fator, Valor bruto, RPS %, Valor RPS, Valor líquido) passam a ficar juntos num bloco "Valores", lado a lado em grade compacta.
- Celular: 2 campos por linha. Tablet: 3. Laptop/desktop: 4 a 5 por linha.
- Campos mais baixos, rótulos curtos ("Margem RCC", "RPS %", "Líquido"), números alinhados à direita.
- Nenhum campo se sobrepõe: valores de até 8 dígitos continuam visíveis.
- Dados pessoais (Nome, CPF, nascimento, idade, telefone, órgão, origem, agendamento) também ficam em grade mais densa.
- Resultado: o formulário fica bem mais curto e precisa de menos rolagem.

## Detalhes técnicos
- `ClientFormDialog.tsx`: seção de valores com `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2`, inputs `h-9 text-sm`, `min-w-0`, remover `min-w-[170px]` do valor bruto.
- Botões de recalcular/copiar menores (`h-7 w-7`) posicionados dentro/ao lado do campo sem empurrar a linha.
- Verificação visual em 375px, 768px e 1280px.
