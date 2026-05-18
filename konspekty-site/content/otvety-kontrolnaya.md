# Ответы к возможным заданиям контрольной работы

Формат каждого ответа: **назначение** → **принцип** → **схема** → **пример** → **проверка** → **пояснение** (1–2 предложения простыми словами).

> **Нумерация:** П1–П5 — темы прошлой контрольной; **1–70** — по файлу `primery-tem-kontrolnoj.md`.

---

## Прошлая контрольная (П1–П5)

### П1. Межсетевой экран на примере nftables

**Назначение.** МСЭ фильтрует пакеты между зонами (Интернет ↔ LAN), разрешая только нужные соединения.

**Принцип.** Ядро Netfilter обрабатывает пакеты в цепочках `input`, `forward`, `output`. nftables задаёт правила в таблицах; stateful-режим отслеживает сессии (`ct state`).

**Схема.** `[Клиент LAN] → [eth1 шлюз] → nft forward → [eth0 WAN] → Интернет`

**Пример** `/etc/nftables.conf`:
```nft
#!/usr/sbin/nft -f
flush ruleset
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;
    iif "lo" accept
    ct state established,related accept
    tcp dport 22 accept
  }
  chain forward {
    type filter hook forward priority 0; policy drop;
    ct state established,related accept
    iifname "eth1" oifname "eth0" accept
  }
}
```
```bash
nft -f /etc/nftables.conf
systemctl enable --now nftables
```

**Проверка:** `nft list ruleset`, `ping` с клиента, `ss -tulpn`.

**Пояснение.** Файрвол по умолчанию запрещает лишнее (`policy drop`), а нужное разрешает явно. `established,related` пропускает ответы на ваши запросы; для шлюза между сетями включите `ip_forward=1`.

---

### П2. Прокси Squid (прикладной уровень)

**Назначение.** Прокси принимает HTTP-запросы от клиентов, может кэшировать ответы и фильтровать доступ в Интернет.

**Принцип.** Уровень L7: клиент обращается к прокси, прокси запрашивает сайт от своего имени. ACL Squid решает allow/deny.

**Схема.** `[Браузер] → :3128 → [Squid] → Интернет`

**Пример** `/etc/squid/squid.conf`:
```
http_port 3128
acl localnet src 192.168.1.0/24
acl SSL_ports port 443
http_access allow localnet
http_access deny all
```
```bash
squid -k parse && systemctl restart squid
```

**Проверка:** в браузере указать прокси `IP:3128`; `tail -f /var/log/squid/access.log`.

**Пояснение.** Squid — посредник: браузер обращается к прокси, прокси — в Интернет. В конце списка правил обычно стоит `deny all`, чтобы доступ был только у разрешённых клиентов.

---

### П3. Управление пользователями в Linux

**Назначение.** Разделение доступа к файлам и командам по учётным записям и группам.

**Принцип.** Записи в `/etc/passwd`, пароли в `/etc/shadow`, группы в `/etc/group`. UID/GID используются при проверке прав.

**Пример:**
```bash
sudo groupadd buh
sudo useradd -m -s /bin/bash -G buh ivanov
sudo passwd ivanov
id ivanov
sudo usermod -aG sudo ivanov   # при необходимости
```

**Проверка:** `grep ivanov /etc/passwd`, вход `su - ivanov`.

**Пояснение.** У пользователя есть логин, UID и группы — от этого зависят права на файлы. Флаг `-m` создаёт домашнюю папку, `-G` добавляет в дополнительные группы.

---

### П4. Резервное копирование и архивирование

**Назначение.** Восстановление данных после сбоя; хранение копий по расписанию.

**Принцип.** `tar` упаковывает каталоги; `rsync` синхронизирует изменения; `cron` запускает задачи по времени.

**Пример:**
```bash
tar -czvf /backup/home-$(date +%F).tar.gz /home
rsync -avz /etc/nftables.conf /backup/etc/
crontab -e
# 0 2 * * * tar -czf /backup/etc-$(date +\%F).tar.gz /etc
```

**Проверка:** `tar -tzf файл.tar.gz`, тестовое восстановление в `/tmp`.

**Пояснение.** `tar` упаковывает каталог в архив, `rsync` копирует изменения на другой диск или сервер. `cron` запускает бэкап по расписанию, например каждую ночь.

---

### П5. Анализ трафика (tshark)

**Назначение.** Диагностика сети: какие протоколы, адреса, ошибки в пакетах.

**Принцип.** Захват кадров с интерфейса, разбор по дисекторам (Ethernet → IP → TCP/UDP → HTTP/DNS).

**Пример:**
```bash
sudo tshark -i eth0 -f "tcp port 80" -w capture.pcapng
sudo tshark -r capture.pcapng -Y "http.request"
sudo tshark -r capture.pcapng -z conv,ip
```

**Проверка:** открыть `capture.pcapng` в Wireshark; увидеть HTTP/DNS запросы.

**Пояснение.** tshark снимает трафик с интерфейса и показывает пакеты по слоям — удобно понять, ушёл ли запрос и пришёл ли ответ.

---

## Сети и безопасность (1–7)

### 1. Stateful-фильтрация (nftables)

**Назначение.** Разрешать ответы на исходящие запросы без отдельного правила на каждый входящий порт.

**Принцип.** Conntrack помечает сессию; пакеты `established,related` пропускаются автоматически.

**Пример:**
```nft
table inet filter {
  chain forward {
    type filter hook forward priority 0; policy drop;
    ct state established,related accept
    iifname "eth1" oifname "eth0" ip saddr 192.168.1.0/24 accept
  }
}
```

**Проверка:** `conntrack -L` (если установлен), пинг и curl с LAN наружу.

**Пояснение.** Если разрешить только новые исходящие сессии, ответы из Интернета режутся. Правило `established,related` пропускает уже начатый обмен.

---

### 2. NAT masquerade (nftables)

**Назначение.** Выход частной сети в Интернет с одним публичным IP.

**Принцип.** Postrouting подменяет source IP LAN на IP внешнего интерфейса; таблица NAT хранит соответствия портов.

**Пример:**
```bash
sysctl -w net.ipv4.ip_forward=1
```
```nft
table ip nat {
  chain postrouting {
    type nat hook postrouting priority srcnat;
    oifname "eth0" masquerade
  }
}
```

**Проверка:** с клиента `curl ifconfig.me`; `nft list table ip nat`.

**Пояснение.** Masquerade подменяет внутренний IP на адрес внешнего интерфейса — так вся LAN выходит в Интернет с одного публичного IP.

---

### 3. Защита SSH (только подсеть)

**Назначение.** Уменьшить атаки перебора на порт 22 из Интернета.

**Пример:**
```nft
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;
    ct state established,related accept
    ip saddr 192.168.1.0/24 tcp dport 22 accept
  }
}
```

**Проверка:** `ssh user@server` с LAN; с чужого IP — timeout.

**Пояснение.** SSH (порт 22) разумно открывать только для подсети офиса, а не для всего Интернета — меньше попыток взлома.

---

### 4. Блокировка ICMP + established

**Назначение.** Скрыть ping снаружи, сохранив работу TCP/UDP сессий.

**Пример:**
```nft
chain input {
  ct state established,related accept
  icmp type echo-request drop
  tcp dport { 22, 80, 443 } accept
}
```

**Проверка:** `ping server` снаружи — нет ответа; `curl https://server` — работает.

**Пояснение.** Можно не отвечать на ping снаружи, но оставить работу TCP и UDP через правила для установленных сессий.

---

### 5. Port forwarding (DNAT)

**Назначение.** Публикация внутреннего веб-сервера (80 → 192.168.1.100).

**Принцип.** DNAT в `prerouting` меняет destination; SNAT/masquerade для ответа.

**Пример:**
```nft
table ip nat {
  chain prerouting {
    type nat hook prerouting priority dstnat;
    iifname "eth0" tcp dport 80 dnat to 192.168.1.100:80
  }
}
```

**Проверка:** `curl http://публичный_IP` с внешней машины.

**Пояснение.** DNAT на границе перенаправляет запрос с белого IP, например на порт 80, на внутренний веб-сервер.

---

### 6. iptables vs nftables

**Назначение.** Понимать смену инструмента фильтрации в современных дистрибутивах.

**Принцип.** Оба используют Netfilter; nftables — единый синтаксис, таблицы семей `inet`, без отдельных таблиц ip/ip6.

| iptables | nftables |
|----------|----------|
| `iptables -A INPUT -p tcp --dport 22 -j ACCEPT` | `nft add rule inet filter input tcp dport 22 accept` |
| `iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE` | `nft ... masquerade` |

**Проверка:** `nft list ruleset`, `iptables-nft -L` (если compat).

**Пояснение.** iptables и nftables управляют одним ядром Netfilter; в новых дистрибутивах чаще используют nftables — один синтаксис для IPv4 и IPv6.

---

### 7. Зональная модель (два интерфейса)

**Назначение.** LAN (`eth1`) и WAN (`eth0`) с разными политиками forward.

**Пример:**
```nft
chain forward {
  iifname "eth1" oifname "eth0" ip saddr 192.168.1.0/24 accept
  iifname "eth0" oifname "eth1" ct state established,related accept
}
```

**Проверка:** клиент LAN выходит в Интернет; с WAN нельзя инициировать доступ в LAN.

**Пояснение.** Между LAN и WAN в forward обычно разрешают трафик из офиса наружу и ответы обратно, а произвольный вход из Интернета — запрещают.

---

## Прокси, DNS, веб (8–14)

### 8. Кэширующий прокси Squid

**Назначение.** Ускорение повторных запросов, экономия канала.

**Пример:**
```
cache_dir ufs /var/spool/squid 100 16 256
http_port 3128
acl local src 192.168.0.0/16
http_access allow local
```

**Проверка:** дважды открыть один URL — во второй раз `HIT` в access.log.

**Пояснение.** Кэш хранит копии страниц — повторное открытие сайта быстрее и экономит канал.

---

### 9. Прозрачный прокси

**Назначение.** Клиент не настраивает прокси вручную; трафик перенаправляется на Squid.

**Пример Squid:** `http_port 3128 transparent`  
**nft:**
```nft
chain prerouting {
  type nat hook prerouting priority dstnat;
  iifname "eth1" tcp dport 80 redirect to :3128
}
```

**Проверка:** запрос HTTP с клиента без настроек прокси — запись в логе Squid.

**Пояснение.** Прозрачный прокси перенаправляет HTTP на Squid без настройки браузера; HTTPS так просто не перехватывают.

---

### 10. Аутентификация на прокси

**Назначение.** Доступ в Интернет только по логину/паролю.

**Пример:**
```bash
htpasswd -c /etc/squid/passwd user1
```
```
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwd
acl auth_users proxy_auth REQUIRED
http_access allow auth_users localnet
http_access deny all
```

**Проверка:** браузер запрашивает логин; неверный пароль — 407.

**Пояснение.** Перед выходом в сеть пользователь вводит логин и пароль — доступ к прокси получают только свои.

---

### 11. DNS-сервер (dnsmasq)

**Назначение.** Локальные имена и пересылка запросов провайдеру.

**Пример** `/etc/dnsmasq.conf`:
```
interface=eth1
dhcp-range=192.168.1.50,192.168.1.150,12h
address=/server.local/192.168.1.10
server=8.8.8.8
```
```bash
systemctl restart dnsmasq
```

**Проверка:** `dig server.local @192.168.1.1`.

**Пояснение.** dnsmasq раздаёт адреса по DHCP и отвечает на локальные имена; внешние имена спрашивает у DNS провайдера.

---

### 12. Разрешение имён (/etc/hosts, resolvectl)

**Назначение.** Локальные имена без DNS; управление резолвером.

**Пример:**
```
# /etc/hosts
192.168.1.10  fileserver.local
```
```bash
resolvectl status
resolvectl dns eth0 192.168.1.1
```

**Проверка:** `getent hosts fileserver.local`, `ping fileserver.local`.

**Пояснение.** Порядок `files dns` значит: сначала смотреть `/etc/hosts`, потом спрашивать DNS-сервер.

---

### 13. Обратный прокси (nginx)

**Назначение.** Один внешний IP, несколько backend-серверов; SSL на nginx.

**Пример:**
```nginx
server {
    listen 80;
    server_name www.example.local;
    location / {
        proxy_pass http://192.168.1.100:8080;
        proxy_set_header Host $host;
    }
}
```

**Проверка:** `curl -H "Host: www.example.local" http://IP_nginx/`.

**Пояснение.** nginx снаружи принимает запросы и передаёт их на внутренний сервер — пользователь видит один адрес, а приложение спрятано в LAN.

---

### 14. Виртуальные хосты HTTP (nginx)

**Назначение.** Разные сайты на одном IP по заголовку `Host`.

**Пример:**
```nginx
server { listen 80; server_name site1.local; root /var/www/site1; }
server { listen 80; server_name site2.local; root /var/www/site2; }
```

**Проверка:** `curl -H "Host: site1.local" http://IP/`.

**Пояснение.** Несколько сайтов на одном IP различаются полем Host в HTTP-запросе — для каждого задаётся свой `server_name`.

---

## Маршрутизация, VLAN (15–22)

### 15. Статическая маршрутизация

**Назначение.** Явные пути к сетям без динамических протоколов.

**Пример:**
```bash
ip route add 192.168.2.0/24 via 192.168.1.1 dev eth0
ip route add default via 203.0.113.1 dev eth0
ip route show
```

**Проверка:** `traceroute 192.168.2.10`.

**Пояснение.** Маршрут указывает: «до сети 192.168.2.0/24 иди через 192.168.1.1». Шлюз должен знать и обратный путь.

---

### 16. IP-forwarding

**Назначение.** Linux работает как маршрутизатор между интерфейсами.

**Пример:**
```bash
sysctl -w net.ipv4.ip_forward=1
echo 'net.ipv4.ip_forward=1' | sudo tee /etc/sysctl.d/99-forward.conf
sysctl -p /etc/sysctl.d/99-forward.conf
```

**Проверка:** ping через хост с двумя NIC с клиента в другую подсеть.

**Пояснение.** `ip_forward` разрешает ядру пересылать пакеты между интерфейсами; без этого Linux не работает как маршрутизатор для других хостов.

---

### 17. VLAN 802.1Q

**Назначение.** Логические сегменты на одном кабеле.

**Пример:**
```bash
ip link add link eth0 name eth0.10 type vlan id 10
ip addr add 192.168.10.1/24 dev eth0.10
ip link set eth0.10 up
```

**Проверка:** `ip -d link show eth0.10`, ping в VLAN с клиента.

**Пояснение.** VLAN помечает кадры номером сети; между коммутаторами нужен trunk с тегами 802.1Q, к ПК — обычно access без тега.

---

### 18. Мост (bridge)

**Назначение.** Объединение интерфейсов в L2-домен (прозрачный коммутатор).

**Пример:**
```bash
ip link add name br0 type bridge
ip link set eth0 master br0
ip link set eth1 master br0
ip link set br0 up
```

**Проверка:** `bridge link`, MAC-обучение между портами.

**Пояснение.** Мост объединяет интерфейсы в один сегмент L2 — как встроенный коммутатор в Linux.

---

### 19. Policy routing

**Назначение.** Разные таблицы маршрутов для разных источников/маркировок.

**Пример:**
```bash
ip rule add from 192.168.2.0/24 table 100
ip route add default via 10.0.0.1 table 100
ip route show table 100
```

**Проверка:** `ip rule list`, трафик с .2.0/24 идёт через нужный шлюз.

**Пояснение.** Policy routing выбирает таблицу маршрутов по адресу отправителя — удобно, когда разным подсетям нужны разные выходы.

---

### 20. DHCP-сервер (isc-dhcp-server / dnsmasq)

**Назначение.** Автовыдача IP, маски, шлюза, DNS клиентам.

**Пример dnsmasq:** см. задание 11.  
**isc-dhcp** `/etc/dhcp/dhcpd.conf`:
```
subnet 192.168.1.0 netmask 255.255.255.0 {
  range 192.168.1.50 192.168.1.150;
  option routers 192.168.1.1;
  option domain-name-servers 192.168.1.1;
}
```

**Проверка:** `dhclient -v eth0` на клиенте; `grep DHCPACK` в логе.

**Пояснение.** DHCP-сервер выдаёт клиенту IP, маску, шлюз и DNS — не нужно настраивать вручную на каждом ПК.

---

### 21. DHCP-клиент

**Назначение.** Получение адреса от сервера на рабочей станции.

**Пример:**
```bash
sudo dhclient -r eth0
sudo dhclient -v eth0
nmcli dev show eth0
```

**Проверка:** `ip addr`, шлюз `ip route`.

**Пояснение.** Клиент запрашивает параметры по DHCP; после получения адреса может выходить в сеть и пинговать шлюз.

---

### 22. Network namespace

**Назначение.** Изоляция сетевого стека для лабораторий и контейнеров.

**Пример:**
```bash
ip netns add ns1
ip link add veth0 type veth peer name veth1
ip link set veth1 netns ns1
ip addr add 10.0.0.1/24 dev veth0
ip netns exec ns1 ip addr add 10.0.0.2/24 dev veth1
ip netns exec ns1 ip link set veth1 up
```

**Проверка:** `ip netns exec ns1 ping 10.0.0.1`.

**Пояснение.** Network namespace — отдельный сетевой стек: удобно для изоляции лабораторных стендов и контейнеров.

---

## VPN (23–26)

### 23. WireGuard site-to-site

**Назначение.** Шифрованный туннель между офисами поверх Интернета.

**Пример** `/etc/wireguard/wg0.conf`:
```ini
[Interface]
Address = 10.255.0.1/30
PrivateKey = <key1>
ListenPort = 51820

[Peer]
PublicKey = <key2>
Endpoint = 203.0.113.5:51820
AllowedIPs = 192.168.2.0/24, 10.255.0.0/30
```
```bash
wg-quick up wg0
```

**Проверка:** `wg show`, ping 192.168.2.1 с другой стороны.

**Пояснение.** WireGuard создаёт зашифрованный туннель; в AllowedIPs перечислено, какие подсети доступны через peer.

---

### 24. OpenVPN (remote access)

**Назначение.** Удалённый сотрудник в корпоративную сеть.

**Принцип.** TUN-интерфейс, сертификаты, `push` маршрутов и DNS.

**Пример (фрагмент сервера):**
```
dev tun
server 10.8.0.0 255.255.255.0
push "route 192.168.1.0 255.255.255.0"
push "dhcp-option DNS 192.168.1.1"
```

**Проверка:** `openvpn --config client.ovpn`, ping внутренний сервер.

**Пояснение.** OpenVPN поднимает интерфейс tun и добавляет маршруты в корпоративную сеть — сотрудник из дома работает как в офисе.

---

### 25. IPsec (strongSwan)

**Назначение.** Стандартный L3 VPN между шлюзами.

**Пример** `/etc/swanctl/swanctl.conf` (упрощённо):
```
connections {
  site {
    local_addrs = 203.0.113.1
    remote_addrs = 203.0.113.2
    local { auth = psk }
    remote { auth = psk }
    children { net { local_ts = 192.168.1.0/24 remote_ts = 192.168.2.0/24 } }
  }
}
```

**Проверка:** `swanctl --load-all`, `ip xfrm state`.

**Пояснение.** IPsec согласует ключи и шифрует IP-пакеты; обе стороны должны указать одни и те же подсети и секрет.

---

### 26. SSH-туннель

**Назначение.** Проброс портов через зашифрованный канал.

**Пример:**
```bash
ssh -L 8080:192.168.1.100:80 user@gateway
ssh -R 9000:localhost:22 user@vps
```

**Проверка:** `curl http://127.0.0.1:8080` после -L.

**Пояснение.** `ssh -L` перенаправляет удалённый порт к вам на localhost; `ssh -R` — наоборот, с сервера наружу, всё внутри SSH.

---

## Диагностика (27–34)

### 27. tcpdump

**Назначение.** Запись пакетов с интерфейса в файл для разбора.

**Принцип.** Перехват на уровне L2/L3 без изменения трафика.

```bash
sudo tcpdump -i eth0 -n host 192.168.1.10 and port 80 -w http.pcap
sudo tcpdump -r http.pcap -A | head
```

**Пояснение.** tcpdump записывает пакеты в файл; ключ `-n` не тратит время на расшифровку имён по DNS.

---

### 28. tshark

**Назначение.** Анализ захваченного трафика с фильтрами по протоколам.

**Принцип.** Разбор файла `.pcap` по уровням: IP, TCP, HTTP, DNS.

```bash
tshark -i eth0 -f "dns" -Y "dns.qry.name" -T fields -e dns.qry.name
tshark -r file.pcap -qz io,stat,1
```

**Проверка:** фильтр `-Y http` показывает HTTP-запросы.

**Пояснение.** tshark — консольный Wireshark: удобно считать пакеты и смотреть поля протоколов без GUI.

---

### 29. ping, traceroute, mtr

**Назначение.** Проверить доступность узла и путь до него.

```bash
ping -c 4 8.8.8.8
traceroute 8.8.8.8
mtr -r -c 10 8.8.8.8
```

**Пояснение.** ping проверяет, отвечает ли хост; traceroute показывает маршрут по промежуточным узлам.

---

### 30. ss / netstat

**Назначение.** Показать, какие порты слушает система и какие соединения открыты.

**Пояснение.** Удобно проверить, запустился ли Squid на 3128 или sshd на 22.

```bash
ss -tulpn
ss -tn state established
netstat -tulpn   # устаревает
```

---

### 31. ARP / соседи

**Назначение.** Узнать MAC-адрес устройства в локальной сети по IP.

```bash
ip neigh show
arping -I eth0 192.168.1.1
```

**Пояснение.** Таблица соседей (`ip neigh`) хранит соответствие IP и MAC в вашей локальной сети.

---

### 32. Мониторинг интерфейсов

**Назначение.** Смотреть нагрузку на сетевой интерфейс в реальном времени.

```bash
ip -s link show eth0
sudo iftop -i eth0
nload eth0
```

**Пояснение.** `ip -s link` показывает счётчики байт; iftop/nload — кто сейчас больше всего грузит канал.

---

### 33. iperf3

**Назначение.** Измерить реальную скорость канала между двумя узлами.

**Пояснение.** Один хост — сервер (`iperf3 -s`), другой — клиент; результат в Мбит/с.

```bash
# сервер
iperf3 -s
# клиент
iperf3 -c 192.168.1.1 -t 30 -P 4
```

---

### 34. DNS-диагностика

**Назначение.** Проверить, резолвится ли имя и какой IP возвращает DNS.

```bash
dig @192.168.1.1 server.local A
dig +trace example.com
host -t MX example.com
```

**Пояснение.** `dig` даёт подробный ответ DNS; если имя не резолвится, сайт по имени не откроется.

---

## Пользователи и права (35–41)

### 35. Учётные записи

**Назначение.** Создание и удаление пользователей, срок действия пароля.

См. **П3**; дополнительно:
```bash
sudo userdel -r olduser
sudo chage -l ivanov
```

**Пояснение.** `userdel -r` удаляет учётку и домашний каталог; `chage` показывает срок действия пароля.

---

### 36. Группы и права

**Назначение.** Кто может читать и менять файлы в общей папке.

```bash
sudo chmod 750 /shared
sudo chown root:buh /shared
sudo chmod g+s /shared
umask 0027
```

**Проверка:** пользователь из группы `buh` создаёт файл в `/shared`.

**Пояснение.** `chmod` и `chown` задают права; `umask` — маска прав для новых файлов по умолчанию.

---

### 37. sudo

```bash
sudo visudo
# ivanov ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx
sudo -l -U ivanov
```

**Пояснение.** sudo позволяет выполнять отдельные команды от root; файл правят только через `visudo`, чтобы не сломать синтаксис.

---

### 38. ACL

```bash
setfacl -m u:petrov:rwx /shared
setfacl -m g:buh:r-x /shared
getfacl /shared
```

**Пояснение.** ACL задаёт права для отдельного пользователя поверх обычных rwx — удобно для общих каталогов.

---

### 39. Квоты

**Назначение.** Ограничить объём диска, который может занять пользователь.

```bash
quotacheck -cum /home
quotaon /home
edquota -u ivanov
repquota /home
```

Требует `usrquota` в `/etc/fstab`.

**Пояснение.** После `quotaon` система не даст записать больше лимита; лимит задаётся в `edquota`.

---

### 40. auditd

**Назначение.** Журнал изменений важных файлов и действий (аудит безопасности).

```bash
auditctl -w /etc/passwd -p wa -k passwd_changes
ausearch -k passwd_changes
aureport -ts today
```

**Пояснение.** `auditctl -w` следит за файлом; `ausearch` ищет события по метке — кто менял `/etc/passwd`.

---

### 41. PAM

**Назначение.** Модули при входе: auth, account, password, session.

**Пример** `/etc/pam.d/sshd` фрагмент и `/etc/security/limits.conf`:
```
ivanov hard nproc 50
```
```
session required pam_limits.so
```

**Пояснение.** PAM — цепочка модулей при входе; `limits.conf` ограничивает, например, число процессов пользователя.

---

## Резервное копирование (42–48)

### 42. tar полный / инкрементальный

**Назначение.** Полная копия каталога и последующие инкременты только изменений.

```bash
tar -czf full.tar.gz /data
tar --listed-incremental=/backup/snapshot.level0 -czf inc1.tar.gz /data
```

**Пояснение.** Первый архив — всё; следующий с `--listed-incremental` — только файлы, изменённые после снимка.

---

### 43. rsync

**Назначение.** Копирование с пропуском уже совпадающих файлов — быстрее повторный бэкап.

```bash
rsync -avz --delete /var/www/ backup@192.168.1.2:/backup/www/
rsync -avz -e ssh ./configs/ user@server:/backup/
```

**Пояснение.** `-a` сохраняет права и время, `-z` сжимает при передаче; по SSH — на удалённый сервер.

---

### 44. rsnapshot

**Назначение.** Автоматические снимки каталогов по расписанию (daily/weekly).

`/etc/rsnapshot.conf`:
```
snapshot_root /backup/
interval daily 7
backup /home/ localhost/
```

```bash
rsnapshot daily
```

**Пояснение.** rsnapshot использует rsync и хранит несколько версий; старые удаляются по `interval`.

---

### 45. cron

**Назначение.** Запуск скриптов бэкапа и обслуживания по расписанию.

```bash
crontab -e
# 15 3 * * * /usr/local/bin/backup.sh
ls -la /etc/cron.d/
```

**Пояснение.** Пять полей: минута, час, день, месяц, день недели, затем команда.

---

### 46. Сжатие

**Назначение.** Уменьшить размер архива для хранения и передачи.

```bash
gzip file
tar -cJf archive.tar.xz dir/
zstd -19 file
```

**Пояснение.** `gzip` и `xz` встроены в `tar -z` / `tar -J`; чем сильнее сжатие, тем дольше упаковка.

---

### 47. Целостность

**Назначение.** Убедиться, что архив не повреждён и не подменён.

```bash
tar -tzf backup.tar.gz
sha256sum backup.tar.gz > backup.sha256
sha256sum -c backup.sha256
```

**Пояснение.** `tar -tzf` только просматривает список файлов; хеш сравнивают с эталоном перед восстановлением.

---

### 48. Бэкап конфигов сети

**Назначение.** Сохранить настройки файрвола, прокси и веб-сервера для быстрого восстановления.

```bash
sudo cp -a /etc/nftables.conf /backup/
sudo tar -czf netcfg-$(date +%F).tar.gz /etc/nftables.conf /etc/squid /etc/nginx
cd /etc && sudo git init && sudo git add nftables.conf
```

**Пояснение.** Конфиги лучше хранить отдельно от системного диска; git помогает видеть, что менялось.

---

## systemd (49–52)

### 49. systemd unit

**Назначение.** Управление службами: запуск, автозагрузка, статус.

```bash
systemctl status nginx
systemctl enable --now squid
```

`/etc/systemd/system/mybackup.service`:
```ini
[Unit]
Description=Backup
[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
```

**Пояснение.** `enable --now` включает службу сейчас и после перезагрузки; unit-файл описывает, что запускать.

---

### 50. journalctl

**Назначение.** Просмотр логов служб (ошибки Squid, nftables и др.).

```bash
journalctl -u nftables -n 50
journalctl -f
journalctl --since "2025-05-18 10:00"
```

**Пояснение.** `-u имя` — лог одной службы; `-f` — «хвост» в реальном времени, как `tail -f`.

---

### 51. Лимиты ресурсов

**Назначение.** Не дать одной службе занять всю память или CPU.

```ini
[Service]
MemoryMax=512M
CPUQuota=50%
```

```bash
systemctl daemon-reload && systemctl restart service
```

**Пояснение.** Лимиты в unit-файле; после правки нужны `daemon-reload` и перезапуск службы.

---

### 52. timer

**Назначение.** Запуск бэкапа по расписанию через systemd (альтернатива cron).

`/etc/systemd/system/backup.timer`:
```ini
[Timer]
OnCalendar=daily
Persistent=true
```
```bash
systemctl enable --now backup.timer
systemctl list-timers
```

**Пояснение.** timer привязан к service; `OnCalendar=daily` — раз в сутки, `list-timers` показывает следующий запуск.

---

## Курс КС (53–64)

### 53. NAT (теория + nft)

**Назначение.** Выход частной сети в Интернет с одним публичным IP.

**Теория:** PAT, адреса RFC 1918, masquerade на postrouting. **Практика:** см. задания **2**, **5**, **П1**.

**Пояснение.** Внутренние адреса снаружи не маршрутизируются; шлюз подменяет их на свой внешний IP и ведёт таблицу сессий.

---

### 54. Разделение доступа (VLAN + nft)

**Назначение.** Разные отделы в разных VLAN; между ними — только разрешённый трафик.

```bash
# VLAN 10 и 20 на шлюзе
# nft: разрешить 192.168.10.0/24 → сервер 192.168.20.10:445
ip saddr 192.168.10.0/24 ip daddr 192.168.20.10 tcp dport 445 accept
```

**Пояснение.** VLAN делит сеть на сегменты; nftables на шлюзе разрешает, например, только SMB к файловому серверу.

---

### 55. DMZ

**Назначение.** Вынести публичные серверы в отдельную зону между Интернетом и LAN.

**Схема:** `eth0 WAN | eth1 LAN | eth2 DMZ (192.168.100.0/24)`

```nft
chain forward {
  iifname "eth0" oifname "eth2" tcp dport { 80, 443 } accept
  iifname "eth2" oifname "eth1" drop
  iifname "eth2" oifname "eth0" ct state established,related accept
}
```

**Пояснение.** Из Интернета в DMZ открыты только 80/443; из DMZ во внутреннюю сеть по умолчанию запрещено.

---

### 56. Сегментация VLAN + маршрутизация

**Назначение.** Несколько логических сетей на одном Linux-шлюзе.

Несколько `eth0.X` с IP шлюзов; `ip_forward=1`; маршруты на клиентах через соответствующий SVI.

**Пояснение.** Каждый VLAN — своя подсеть; шлюз маршрутизирует между ними по правилам и ACL.

---

### 57. Keepalived + VRRP

`/etc/keepalived/keepalived.conf`:
```
vrrp_instance VI_1 {
  state MASTER
  interface eth0
  virtual_router_id 51
  priority 100
  virtual_ipaddress { 192.168.1.1/24 }
}
```

**Проверка:** `ip addr` — VIP на активном узле; stop keepalived — VIP переезжает.

**Пояснение.** VRRP держит один виртуальный IP шлюза на двух маршрутизаторах; при падении master IP переходит на backup.

---

### 58. Bonding (LACP)

```bash
ip link add bond0 type bond mode 802.3ad
ip link set eth0 master bond0
ip link set eth1 master bond0
```

`/etc/netplan` или `ifenslave` по дистрибутиву.

**Пояснение.** Несколько кабелей работают как один канал: выше скорость и при обрыве одного линка связь остаётся.

---

### 59. STP (теория) + bridge в Linux

**Теория:** блокировка портов, root bridge.  
```bash
bridge link show
brctl showstp br0   # legacy
```

Включить STP: `ip link set br0 type bridge stp_state 1`

**Пояснение.** STP на коммутаторе блокирует лишние порты, чтобы не было петли; в Linux мост тоже может включить STP.

---

### 60. hostapd (Wi‑Fi AP)

`/etc/hostapd/hostapd.conf`:
```
interface=wlan0
ssid=LabWiFi
wpa=2
wpa_passphrase=SecretPass123
```

```bash
systemctl restart hostapd
```

**Пояснение.** hostapd превращает Wi‑Fi-интерфейс в точку доступа с заданным SSID и паролем WPA2.

---

### 61. FreeRADIUS

`/etc/freeradius/3.0/clients.conf`:
```
client lab_switch {
  ipaddr = 192.168.1.10
  secret = testing123
}
```

`/etc/freeradius/3.0/mods-config/files/authorize`:
```
user1 Cleartext-Password := "pass"
```

```bash
radtest user1 pass localhost 0 testing123
```

**Пояснение.** RADIUS проверяет логин/пароль для Wi‑Fi или VPN; коммутатор — «клиент», сервер — FreeRADIUS.

---

### 62. SNMP

`/etc/snmp/snmpd.conf`: `rocommunity public 192.168.1.0/24`  
```bash
snmpwalk -v2c -c public 192.168.1.1 system
```

**Пояснение.** SNMP передаёт данные об устройстве (uptime, интерфейсы); community — как пароль на чтение для системы мониторинга.

---

### 63. rsyslog remote

**Клиент** `/etc/rsyslog.d/remote.conf`:
```
*.* @@192.168.1.100:514
```
**Сервер:** модуль `imtcp`, файл `/var/log/remote/`

**Пояснение.** Клиенты шлют логи на центральный сервер — проще искать события по всей сети в одном месте.

---

### 64. NetFlow / nfdump (теория)

**Теория:** экспорт потоков с маршрутизатора, анализ трафика.  
```bash
nfcapd -w -D -l /var/netflow -p 9995
nfdump -R /var/netflow -s ip/bytes
```

**Пояснение.** Маршрутизатор отправляет сводки потоков; nfdump собирает и показывает, кто сколько трафика генерировал.

---

## Дополнительно (65–70)

### 65. IPv6

**Назначение.** Работа с адресами и маршрутами IPv6 в Linux.

**Пояснение.** У IPv6 адресов длинный формат; ping6 проверяет доступность по новому протоколу.

```bash
ip -6 addr add 2001:db8::1/64 dev eth0
ip -6 route add default via 2001:db8::ffff
ping6 2001:4860:4860::8888
```

---

### 66. TLS / openssl

**Назначение.** Создать самоподписанный сертификат для HTTPS на тестовом сервере.

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/nginx.key -out /etc/ssl/certs/nginx.crt
curl -vk https://server/
```

**Пояснение.** Сертификат подписан самим собой — для учебного HTTPS; браузер предупредит, но шифрование будет.

---

### 67. fail2ban

**Назначение.** Временно блокировать IP после неудачных попыток входа по SSH.

**Пояснение.** Смотрит логи и добавляет правило в файрвол — защита от перебора паролей.

`/etc/fail2ban/jail.local`:
```ini
[sshd]
enabled = true
maxretry = 3
bantime = 3600
```
```bash
fail2ban-client status sshd
```

---

### 68. Docker network

**Назначение.** Изолированная виртуальная сеть для контейнеров.

**Пояснение.** Контейнеры в одной docker-сети видят друг друга по внутренним IP.

```bash
docker network create --subnet=172.20.0.0/16 appnet
docker run -d --network appnet nginx
docker network inspect appnet
```

---

### 69. ufw

**Назначение.** Простой интерфейс к файрволу для базовых правил на хосте.

**Пояснение.** `ufw enable` включает защиту; правила `allow` открывают нужные порты.

```bash
ufw default deny incoming
ufw allow from 192.168.1.0/24 to any port 22
ufw enable
ufw status verbose
```

---

### 70. Тестирование nftables

**Назначение.** Проверить синтаксис правил до применения и смотреть счётчики пакетов.

**Пояснение.** `nft -c` проверяет файл без загрузки; `nft list ruleset` показывает активные правила.

```bash
nft -c -f /etc/nftables.conf
nft list ruleset
nft reset counters table inet filter
nft monitor
```

---

## Краткая шпаргалка перед контрольной

| Задача | Команда |
|--------|---------|
| Правила файрвола | `nft list ruleset` |
| Маршруты | `ip route` |
| Включить роутинг | `sysctl net.ipv4.ip_forward` |
| Порты | `ss -tulpn` |
| Захват | `tcpdump -i any -w f.pcap` |
| DNS | `dig @server name` |
| Бэкап | `tar -czf` / `rsync -avz` |
| Служба | `systemctl status` |
| Лог | `journalctl -u служба` |

---

*Ответы ориентированы на Debian/Ubuntu-подобные системы; имена интерфейсов (`eth0`, `ens33`) подставьте свои.*
