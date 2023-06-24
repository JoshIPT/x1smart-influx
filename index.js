import got from 'got';
import {InfluxDB,Point} from "@influxdata/influxdb-client";

/* Configurables */

const Server = 'http://10.80.111.13/'; // Inverter IP
const Password = 'ABC123'; // Serial # of Inverter (can be see by scanning for Wireless Networks
const PVCapacity = 8000; // Wattage of system, used for sanitising inputs

const Influx_Token = "--"; // Influx API Key
const Influx_URL = 'https://us-east-1-1.aws.cloud2.influxdata.com'; // Hosted Influx Server
const Influx_Org = 'My Organisation'; // Influx Organisation
const Influx_Bucket = 'solar'; // Database/Bucket configured in Influx

/* End of Configurables */

// Create new InfluxDB Connection
const influx = new InfluxDB({
    url: Influx_URL,
    token: Influx_Token
});

// Set the interval to poll the inverter
setInterval(poll, 5000);


// Function that performs the poll
function poll() {
    // Send HTTP POST to the Inverter to retreive the JSON object
    got.post(Server, {form: { optType: "ReadRealTimeData", pwd: Password } }, {responseType: 'json'})
        .then(res => {
            var js;
            try {
                // Parse the JSON reply
                js = JSON.parse(res.body);
                // Send the JSON object to our reply class for decoding
                var reply = new X1Reply(js);

                // Write the data to Influx
                let writeClient = influx.getWriteApi(Influx_Org, Influx_Bucket, 'ns');
                for (const property in reply) {
                    let point = new Point(property)
                        .timestamp(new Date())
                        .floatField("value", reply[property]);
                    writeClient.writePoint(point);
                }
                // Flush the Influx client to push new values
                writeClient.flush();

            } catch(e) {
                console.log("Malformed response received from the inverter/influx: ", e.message);
            }

        })
        .catch(err => {
            console.log('Error: ', err.message);
        });
}

// Reply coding class
class X1Reply {
    constructor (data) {
        var values = data.Data;
        this.network_voltage = this.calc(values[0], 10, "V"); // Network Voltage
        this.output_current = this.calc(values[1], 10, "A"); // Output Current
        if (values[2] > PVCapacity) { this.ac_power = 0; } // Sanitise AC Power
        else { this.ac_power = this.calc(values[2], 1, "W"); } // AC Power
        this.pv1_voltage = this.calc(values[3], 10, "V"); // Voltage of PV1
        this.pv2_voltage = this.calc(values[4], 10, "V"); // Voltage of PV2
        this.pv1_current = this.calc(values[5], 10, "A"); // Current of PV1
        this.pv2_current = this.calc(values[6], 10, "A"); // Current of PV2
        this.pv1_power = this.calc(values[7], 1, "W"); // Power of PV1
        this.pv2_power = this.calc(values[8], 1, "W"); // Power of PV2
        this.grid_freq = this.calc(values[9], 100, "Hz"); // Grid Frequency
        this.total_energy = this.calc(values[11], 10, "KWh"); // Total Energy
        this.today_energy = this.calc(values[13], 10, "KWh"); // Today's Energy
        this.inverter_temp = this.calc(values[39], 1, "°C"); // Inverter Temperature
        if (values[48] > PVCapacity) { this.exported_power = 0; } // Sanitise Exported Power
        else { this.exported_power = this.calc(values[48], 1, "W"); } // Exported Power
        this.total_feedin = this.calc(values[50], 100, "KWh"); // Total Feed In
        this.total_consumption = this.calc(values[52], 100, "KWh"); // Total Consumption
        this.consumed_power = (((Math.round(this.ac_power - this.exported_power) + Number.EPSILON) * 100) / 100); // Math to generate Consumed power
    }
    calc(value, divisor, suffix = "") {
        return (Math.round(((value / divisor) + Number.EPSILON) * 100) / 100); // + suffix;
    }
}

// Run initial poll on first run
poll();
