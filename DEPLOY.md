# Deploy na VPS

Guia completo, do DNS ao primeiro login. Cada bloco é copiável.

- **VPS:** `187.127.48.167`, acesso `ssh gabriel@187.127.48.167`
- **Domínio:** `financeops.korvantis.io`
- **Resultado:** HTTPS válido, banco em volume, backup diário automático

---

## 0. Sobre porta no DNS

**Não existe porta em registro DNS.** Um registro A mapeia nome para IP e nada
mais — `financeops.korvantis.io -> 187.127.48.167` está correto do jeito que
está. Escrever `187.127.48.167:3000` ali seria inválido e o Cloudflare recusaria.

A porta é resolvida uma camada acima:

```
navegador -> https://financeops.korvantis.io  (porta 443, implícita)
                        |
                     Caddy escuta 80 e 443 na VPS
                        |
             reverse_proxy financeops:3000  (rede interna do Docker)
```

O app escuta 3000 **dentro** do Docker e não é publicado no host. Ninguém acessa
`:3000` de fora, e é assim que deve ser: essa porta seria HTTP puro, e o link de
acesso do e-mail trafega nessa conexão.

---

## 1. Cloudflare — criar o subdomínio

Faça isto **primeiro**: a propagação leva alguns minutos e o certificado depende
dela.

1. Entre no Cloudflare e selecione o domínio **korvantis.io**
2. Menu lateral → **DNS** → **Records** → **Add record**
3. Preencha:

| Campo | Valor |
|---|---|
| Type | `A` |
| Name | `financeops` |
| IPv4 address | `187.127.48.167` |
| Proxy status | **DNS only** (nuvem **cinza**) |
| TTL | Auto |

4. **Save**

### Por que "DNS only" e não o proxy laranja

Com a nuvem laranja, a Cloudflare intercepta as portas 80 e 443 antes de
chegarem na sua VPS. O Caddy pede o certificado ao Let's Encrypt por um desafio
HTTP na porta 80 — que nunca chegaria. O resultado é o Caddy tentando renovar em
loop e o site fora do ar.

Dá para usar o proxy laranja, mas aí é preciso trocar o desafio para DNS-01 com
um token de API da Cloudflare, o que exige uma imagem customizada do Caddy. Para
uma ferramenta interna de 6 pessoas, não compensa.

O que você perde com "DNS only": ocultação do IP e proteção contra DDoS. O que
ganha: o certificado funciona sem configuração nenhuma.

### Conferir antes de seguir

Da sua máquina:

```bash
nslookup financeops.korvantis.io
```

Precisa responder `187.127.48.167`. Se ainda vier outra coisa, espere alguns
minutos. **Não siga adiante antes disso** — o Let's Encrypt limita a 5
certificados por semana e domínio, e tentativas falhas queimam a cota.

---

## 2. Deploy key do GitHub

A VPS precisa ler o repositório privado. Uma deploy key é uma chave SSH que vale
para **um repositório só** e pode ser somente-leitura — bem melhor que colocar
sua chave pessoal no servidor.

### Na VPS

```bash
ssh gabriel@187.127.48.167

ssh-keygen -t ed25519 -C "financeops-vps" -f ~/.ssh/financeops_deploy -N ""
cat ~/.ssh/financeops_deploy.pub
```

Copie a linha inteira que apareceu (começa com `ssh-ed25519`).

### No GitHub

1. Abra o repositório do FinanceOps
2. **Settings** → **Deploy keys** → **Add deploy key**
3. Title: `VPS Korvantis`
4. Key: cole a linha copiada
5. **Não** marque "Allow write access" — a VPS só precisa ler
6. **Add key**

### De volta na VPS

```bash
cat >> ~/.ssh/config <<'FIM'

Host github-financeops
  HostName github.com
  User git
  IdentityFile ~/.ssh/financeops_deploy
  IdentitiesOnly yes
FIM

chmod 600 ~/.ssh/config

# Deve responder: "Hi Korvantis/financeops! You've successfully authenticated..."
ssh -T github-financeops
```

---

## 3. Docker na VPS

```bash
# Já tem? Pula para o passo 4.
docker --version && docker compose version
```

Se não tiver, no Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Usar docker sem sudo
sudo usermod -aG docker $USER
```

**Saia e entre no SSH de novo** para o grupo valer:

```bash
exit
ssh gabriel@187.127.48.167
docker run --rm hello-world   # confirma que funciona sem sudo
```

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

A porta 3000 **não** é liberada de propósito: o app não é publicado no host,
só o Caddy conversa com ele pela rede interna do Docker.

---

## 4. Clonar e configurar

```bash
git clone git@github-financeops:Korvantis/financeops.git ~/financeops
cd ~/financeops
```

Gere o segredo da sessão:

```bash
openssl rand -base64 32
```

Crie o `.env` (troque `COLE_AQUI` pelo valor gerado e ajuste o SMTP):

```bash
cat > .env <<'FIM'
DOMINIO=financeops.korvantis.io
EMAIL_ADMIN=gabriel@korvantis.io

AUTH_SECRET=COLE_AQUI_O_OPENSSL_RAND

# Entrada de emergência para o primeiro login. REMOVA depois.
AUTH_BOOTSTRAP_EMAIL=gabrielnmuller12@gmail.com

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=gabrielnmuller12@gmail.com
SMTP_PASS=senhadeappsemespacos
EMAIL_FROM=FinanceOps <gabrielnmuller12@gmail.com>
FIM

chmod 600 .env
```

Atenção ao `SMTP_PASS`: a senha de app do Google tem **16 caracteres sem
espaços**. O Google exibe `abcd efgh ijkl mnop` — cole sem os espaços.

---

## 5. A máquina já tem outro proxy?

Confira antes de subir:

```bash
sudo ss -tlnp '( sport = :80 or sport = :443 )'
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

Se **nada** estiver nas portas 80/443, pule para o passo 6.

Se já houver um proxy (Caddy, nginx, Traefik) servindo outros sites, o Caddy
deste compose não sobe — só um processo pode escutar a 443, e o erro é
`Bind for 0.0.0.0:80 failed: port is already allocated`. Também não adianta
mudar o FinanceOps para outra porta: o Let's Encrypt só valida domínio pela 80
ou pela 443, então uma porta alternativa não renderia certificado.

O certo é o FinanceOps virar **mais um site do proxy que já existe**.

**a)** Descubra a rede do proxy (troque `stack-caddy-1` pelo nome real):

```bash
docker inspect stack-caddy-1 \
  -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}'
```

**b)** Acrescente ao `.env` do FinanceOps:

```bash
cat >> ~/financeops/.env <<'FIM'
COMPOSE_FILE=docker-compose.proxy.yml
REDE_PROXY=COLE_A_REDE_DO_PASSO_A
FIM
```

Com `COMPOSE_FILE` no `.env`, o comando continua sendo `docker compose up -d` —
sem precisar lembrar do `-f` toda vez. Esse arquivo herda a definição do app do
compose principal e só troca duas coisas: nenhum Caddy próprio e o container
plugado na rede do proxy.

**c)** Descubra onde fica o Caddyfile do proxy existente:

```bash
docker inspect stack-caddy-1 -f '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

Adicione neste arquivo:

```
financeops.korvantis.io {
	reverse_proxy financeops:3000

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}
}
```

O nome `financeops` é resolvido pelo DNS interno do Docker porque os dois
containers passam a dividir a mesma rede. O certificado é responsabilidade do
proxy, que já faz isso para os outros domínios.

**d)** Recarregue o proxy — sem derrubar os sites que ele já serve:

```bash
docker exec stack-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

Se você já tinha tentado subir o Caddy do FinanceOps, limpe os volumes órfãos:

```bash
docker volume rm financeops-caddy-dados financeops-caddy-config
```

---

## 6. Subir

```bash
docker compose up -d --build
```

A primeira vez leva alguns minutos (compila a imagem). Acompanhe:

```bash
docker compose logs -f
```

Você deve ver, em ordem:

```
[FinanceOps] preparando o banco em file:/dados/financeops.db
[FinanceOps] aplicando seed (idempotente)
[FinanceOps] iniciando servidor
```

E, do Caddy, algo como `certificate obtained successfully`.

Abra **https://financeops.korvantis.io** — com cadeado.

---

## 7. Primeiro login

1. Digite `gabrielnmuller12@gmail.com` (o `AUTH_BOOTSTRAP_EMAIL`)
2. Confira o e-mail e clique no botão
3. Já dentro, vá em **Configurações → Sócios** e cadastre o e-mail de cada um
4. Volte ao SSH e **remova o bootstrap**:

```bash
cd ~/financeops
sed -i '/AUTH_BOOTSTRAP_EMAIL/d' .env
docker compose up -d
```

O bootstrap é uma porta que ignora o cadastro. Com os e-mails no lugar, ela só
aumenta a superfície de ataque.

### Se o e-mail não chegar

```bash
docker compose exec financeops node scripts/diagnostico-email.mjs gabrielnmuller12@gmail.com
```

O script separa as quatro causas possíveis: endereço não cadastrado, sócio
inativo, SMTP ausente ou SMTP recusando.

---

## 8. Levar seus dados

Você já tem 70 registros na máquina local. Para trazê-los:

1. Na sua máquina, rode `npm run db:backup` e pegue o `.json` mais recente de
   `backups/`
2. No FinanceOps da VPS, vá em **Importar → Backup completo**
3. Selecione o arquivo, escolha **Substituir tudo** e confirme

Os IDs são preservados, então o resultado fica idêntico ao original.

---

## 9. Backup automático

Sem isto, o backup depende de alguém lembrar — e em agosto ninguém lembra.

```bash
# Todo dia às 3h da manhã
(crontab -l 2>/dev/null; echo "0 3 * * * cd ~/financeops && docker compose exec -T financeops node scripts/backup-runtime.mjs >> ~/financeops-backup.log 2>&1") | crontab -

crontab -l   # confere
```

Os arquivos ficam dentro do volume. Para trazer para a sua máquina:

```bash
# Da SUA máquina, não da VPS
ssh gabriel@187.127.48.167 'docker cp financeops:/dados/backups - ' | tar -x
```

Ou copie para o servidor primeiro e depois baixe com `scp`:

```bash
# Na VPS
docker cp financeops:/dados/backups ~/backups-financeops

# Na sua máquina
scp -r gabriel@187.127.48.167:~/backups-financeops ./
```

**Leve para o Google Drive.** Backup que mora no mesmo servidor que os dados
protege contra erro de software, não contra a VPS morrer.

---

## 10. Atualizar depois

```bash
cd ~/financeops
./docker/atualizar.sh
```

O script faz backup, `git pull`, rebuild, sobe e confere a saúde. Se o app não
ficar saudável em 60 segundos, ele mostra o log e sai com erro.

**Na maior parte das vezes você não vai precisar disto.** Com o runner do
GitHub Actions instalado, todo push na `main` faz o deploy sozinho — veja
[CI.md](CI.md). O `atualizar.sh` continua sendo o caminho certo para deploy
assistido: migração destrutiva de schema, ou quando algo já deu errado.

Na primeira vez, dê permissão:

```bash
chmod +x docker/atualizar.sh docker/entrypoint.sh
```

---

## Comandos do dia a dia

```bash
cd ~/financeops

docker compose ps                      # o que está rodando
docker compose logs -f financeops      # logs do app
docker compose logs -f caddy           # logs do proxy e do certificado
docker compose restart financeops      # reinicia só o app
docker compose down                    # para tudo (dados ficam no volume)
docker compose up -d                   # sobe de novo

docker compose exec financeops sh      # shell dentro do container
docker volume inspect financeops-dados # onde o banco está no disco
```

---

## Quando algo dá errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `ERR_CONNECTION_REFUSED` | Containers não subiram | `docker compose ps` e `docker compose logs` |
| Aviso de certificado inválido | DNS ainda não propagou, ou nuvem laranja ligada | `nslookup financeops.korvantis.io`; deixe o registro como DNS only |
| Cadeado ok, mas 502 | O app não subiu | `docker compose logs financeops` |
| Login diz "confira seu e-mail" e nada chega | Endereço não cadastrado, ou SMTP | `docker compose exec financeops node scripts/diagnostico-email.mjs SEU@EMAIL` |
| Entra e volta para o login | `AUTH_SECRET` mudou, ou `DOMINIO` diferente do acessado | Confira o `.env` e refaça `docker compose up -d` |
| Certificado não sai, log fala de rate limit | Muitas tentativas com DNS errado | Espere; o Let's Encrypt libera 5 por semana |

### Recomeçar do zero, apagando os dados

```bash
docker compose down -v      # o -v APAGA os volumes, inclusive o banco
docker compose up -d --build
```

Só faça isso com um backup na mão.
