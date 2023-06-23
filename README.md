# Solax X1-Smart to Influx DB

Sign up for InfluxDB and Grafana cloud accounts.

Generate an API key and save.

Edit `index.json` and modify the following constants:

- `server` - set to http://ip-to-your-solax/
- `password` - this is the serial number of your solax inverter, and can be found by looking at the broadcasted wireless network
- `INFLUXDB_TOKEN` - this is your InfluxDB API token
- `influx_url` - at present all hosted Influx are served out of this host so this is likely fine to be left as is.

Also modify the following `let`'s:
- `let org` - your influx db organisation
- `let bucket` - your influx db bucket/database

Setup and install supervisor - `apt install supervisor`

Create the file `x1smart.conf` in `/etc/supervisor/conf.d`

Set the contents to:

```
[program:x1smart]
command=/usr/bin/node /home/pi/x1smart-influx/index.js
autostart=true
autorestart=unexpected
```
Replace the above path with the location of where you have cloned the repo.
Then execute `systemctl restart supervisor.service`, then if you run `supervisor` you should see that x1smart is running.

From here, link your Grafana datasource with your FlightSQL Influx datasource, information for this is available on Google.
Once connected, import you the `Grafana Dashboard.json` file included in this git repo, this should be your graphing setup.

![solar](https://github.com/JoshIPT/x1smart-influx/assets/44308535/d4d2b63d-0a47-4047-b0e9-90b9d7a912a0)
