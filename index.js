const fetch = require('node-fetch');
const _ = require('lodash');
const cheerio = require('cheerio');
const HttpProxyAgent = require('http-proxy-agent');

const baseUrl = 'http://mp.weixin.qq.com';

const proxyUser = "H660AJ41O8R6W1JD";
const proxyPass = "A7264300A2A759AF";

const wait = (ms)=>new Promise(resolve=>setTimeout(resolve, ms));

async function getUrlByName(name, trys=0){
  const url = 'http://weixin.sogou.com/weixin?type=1&ie=utf8&query=' + encodeURIComponent(name);
  const res = await fetch(url, getOpts());
  const html = await res.text();

  if(/用户您好，您的访问过于频繁，为确认本次访问为正常用户行为，需要您协助验证。/.test(html)){
    const ip = _.get(html.match(/ip-time-p">IP：([^<]+)<br>/), '[1]', '');
    const str = `ip ${ip} 被屏蔽，url: ${url}`

    if(trys === 10){
      throw new Error(str)
    }
    console.log(`${str}, 尝试重新请求, trys: ${trys + 1}`)
    await wait(200);

    return getUrlByName(name, trys + 1)
  }

  const $ = cheerio.load(html);

  const href = $('#main > div.news-box > ul > li:nth-child(1) > div > div.txt-box > p.tit > a').attr('href');
  if(!href){
    console.log(html)
    throw new Error('匹配不到超链接' + url)
  }
  return href;
}

async function getHistoryUrl(url, trys=0){
  const res = await fetch(url, getOpts());
  const html = await res.text()

  if(/为了您的安全请输入验证码/.test(html) || !html){
    const str = `微信屏蔽当前ip 或 访问失败, url: ${url}`;

    if(trys === 10){
      console.log(html)
      throw new Error(str)
    }

    console.log(`${str}, 尝试重新请求, trys: ${trys + 1}`)
    const newUrl = await getUrlByName('冷兔');
    return getHistoryUrl(newUrl, trys + 1)
  }

  const matchResult = html.match(/var msgList = ({"list":\[{"app_msg_ext_info":.+]});/)
  if(!matchResult){
    console.log(html)
    throw new Error('匹配不到列表数据');
  }

  // 提取出url
  const wxMyListString = matchResult[1];
  let wxMyList;
  try {
    wxMyList = JSON.parse(wxMyListString);
  } catch (e){
    // todo: 正确处理error
    throw e;
  }

  return _.get(wxMyList, 'list', []).map(d=>baseUrl + d.app_msg_ext_info.content_url.replace(/&amp;/g, '&'));
}

async function getWxPage(url){
  const res = await fetch(url, getOpts());
  const html = await res.text()

  return html;
}

async function getWxPages(urls){
  for (let i=0, len = urls.length; i<len; i++) {
    const url = urls[i];
    const html = await getWxPage(url)
    const $ = cheerio.load(html);
    console.log(`${url}: ${$('#activity-name').text().trim()}`)

    await wait(200)
  }
}

async function run(){
  const link = await getUrlByName('冷兔');
  console.log(link)

  const historyUrls = await getHistoryUrl(link);
  console.log(historyUrls);

  await getWxPages(historyUrls)

  console.log('finished');
}

run().catch(console.error);


function getOpts(){
  return {
    headers: {
      ...getHeader(),
      'Proxy-Authorization': "Basic " + new Buffer(proxyUser + ":" + proxyPass).toString("base64")
    },
    agent: getAgent()
  }
}


function getHeader(){
  return {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,zh-TW;q=0.7'
  };
}

function getAgent(){
  return new HttpProxyAgent('http://http-dyn.abuyun.com:9020')
}
