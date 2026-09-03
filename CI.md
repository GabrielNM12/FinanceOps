@ -1,36 +1,36 @@
# Deploy automático

Todo push na `main` vai para produção sozinho, depois de passar pelos testes.

```
push na main
   |
   v
[GitHub] verificar  ->  npm ci, prisma generate, npm test, typecheck, build
   |                    falhou? para aqui. A VPS não é tocada.
   v
[VPS]    publicar   ->  backup, git pull, build, up -d, healthcheck
                        falhou? volta para o commit anterior sozinho.
```

O arquivo é [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml); o
que roda na VPS é [`docker/deploy-ci.sh`](docker/deploy-ci.sh).

---

## Por que runner self-hosted

A alternativa comum é o runner do GitHub conectar por SSH na VPS. Isso exige uma
chave privada guardada nos secrets do repositório e a porta 22 alcançável pela
faixa de IPs do GitHub — que é grande e muda.

O runner self-hosted inverte a direção: ele roda na VPS e **busca** os jobs. A
conexão é sempre de dentro para fora. Não há chave de servidor em lugar nenhum,
nem porta nova aberta.

O custo é um serviço a mais no servidor. E uma regra que não pode ser
esquecida: **o repositório precisa continuar privado.** Num repositório público,
qualquer pessoa abre um pull request com um workflow e ele roda na sua máquina.

---

@ -38,9 +38,9 @@ qualquer pessoa abre um pull request com um workflow e ele roda na sua máquina.

### 1. Pegar o token de registro

No GitHub: **Settings → Actions → Runners → New self-hosted runner → Linux**.

A página mostra um token que **expira em uma hora**. Deixe-a aberta.

### 2. Instalar na VPS

@ -49,7 +49,7 @@ ssh gabriel@187.127.48.167

mkdir -p ~/actions-runner && cd ~/actions-runner

# Confira a versão mais recente na página do GitHub e ajuste se preciso.
VERSAO=2.321.0
curl -o runner.tar.gz -L \
  https://github.com/actions/runner/releases/download/v${VERSAO}/actions-runner-linux-x64-${VERSAO}.tar.gz
@ -68,11 +68,11 @@ tar xzf runner.tar.gz && rm runner.tar.gz
  --unattended
```

O `--unattended` aceita os padrões sem perguntar nada.

### 4. Subir como serviço

Sem isto o runner morre quando você fecha o SSH.

```bash
sudo ./svc.sh install gabriel
@ -80,26 +80,26 @@ sudo ./svc.sh start
sudo ./svc.sh status
```

O `gabriel` no `install` importa: o serviço roda com esse usuário, que é quem
está no grupo `docker` e é dono de `~/financeops`. Rodar como `root` faria os
arquivos do repositório trocarem de dono no primeiro deploy.

### 5. Conferir

Volte em **Settings → Actions → Runners**. O `vps-korvantis` deve aparecer
**Idle**, com bolinha verde.

### 6. Levar o script para a VPS

O primeiro deploy chama `docker/deploy-ci.sh`, que só existe depois de um pull:

```bash
cd ~/financeops && git pull
chmod +x docker/deploy-ci.sh
```

Sem este passo, o primeiro workflow falha com "No such file or directory" — e o
segundo funciona, porque o pull do primeiro já aconteceu. Melhor não passar por
isso.

---
@ -108,22 +108,22 @@ isso.

| Onde | O que a VPS sofre | O que fazer |
|---|---|---|
| Testes, typecheck ou build no GitHub | **Nada.** O job de deploy nem começa. | Corrija e dê push de novo |
| `git pull --ff-only` | Nada — para antes de construir | Alguém editou arquivo direto na VPS. Veja com `git -C ~/financeops status` |
| Build da imagem | Volta ao commit anterior sozinho | Leia o log no Actions |
| App não fica saudável em 90s | Volta ao commit anterior sozinho | O log do container está no próprio job, no passo "Log do app" |
| A reversão também falha | App fora do ar | `cd ~/financeops && docker compose logs --tail 60 financeops` |

O backup roda **antes** de qualquer alteração, então o pior caso tem sempre um
ponto de retorno para os dados.

### O limite da reversão automática

Ela desfaz o **código**, não o **banco**. Se a versão nova alterou o schema, o
`prisma db push` do entrypoint já aplicou a mudança, e voltar o commit não
desfaz uma coluna removida.

Migração destrutiva merece deploy assistido:

```bash
ssh gabriel@187.127.48.167
@ -133,22 +133,22 @@ cd ~/financeops

---

## Deploy à mão

Pela aba **Actions → Deploy → Run workflow** — sem precisar de commit. Ou pelo
SSH, com o `atualizar.sh` acima.

## Mudanças só de documentação

Arquivos `.md` não disparam deploy: são três minutos de build para nada. Eles
chegam na VPS junto com a próxima mudança de código, ou por um
**Run workflow** manual.

## Manutenção do runner

```bash
cd ~/actions-runner
sudo ./svc.sh status     # está rodando?
sudo ./svc.sh stop
sudo ./svc.sh start

