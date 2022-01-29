import sqlite3
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

conn = sqlite3.connect('datastore.db')
cur = conn.cursor()


class POSServer(BaseHTTPRequestHandler):
    def do_GET(self):
        searchid = self.path[1:]
        print("Fetching id:", searchid)
        #TODO: lookup item in database
        cur.execute("SELECT id, name, price FROM Items WHERE id = ?", (searchid, ))
        row = cur.fetchone()
        id = row[0]
        name = row[1]
        price = row[2]
        itemlist= {
            "id": id,
            "name": name,
            "price": price
        }  
        itemjson = json.dumps(itemlist)
        #itemlist = dict()
        #itemlist["id"] = id
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-type", "text/json")
        self.end_headers()

        self.wfile.write(bytes(itemjson, "utf-8")) #writing to the network


# Make sure the server is created at current directory
#os.chdir('.')
# Create server object listening the port 80
server_object = HTTPServer(server_address=('', 8080), RequestHandlerClass=POSServer)
# Start the web server
server_object.serve_forever()
