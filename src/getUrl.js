import crypto from 'crypto';
import { Buffer } from 'buffer';

export function assembleAuthUrl(hosturl, apiKey, apiSecret) {
    const ul = new URL(hosturl);
    // Signing date
    const date = new Date().toUTCString();
    // Fields participating in signature: host, date, and request-line
    const signString = [`host: ${ul.host}`, `date: ${date}`, `GET ${ul.pathname} HTTP/1.1`];
    // String consisting of concatenated signatures
    const sgin = signString.join('\n');
    // Signature results
    const sha = crypto.createHmac('sha256', apiSecret).update(sgin).digest('base64');
    // Construct request parameters, and urlencoding is not required now
    const authUrl = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${sha}"`;
    // Encode the request parameters with base64
    const authorization = Buffer.from(authUrl).toString('base64');
    const v = new URLSearchParams();
    v.append('host', ul.host);
    v.append('date', date);
    v.append('authorization', authorization);
    // Add the encoded string url encode after url
    const callurl = hosturl + "?" + v.toString();
    console.log("callurl");
    console.log(callurl);
    return callurl;
}
