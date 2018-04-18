const fetch = require('node-fetch');
const _ = require('lodash');
const cheerio = require('cheerio');
const HttpProxyAgent = require('http-proxy-agent');

const baseUrl = 'https://mp.weixin.qq.com';
function getHeader(){
  return {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,zh-TW;q=0.7'
  };
}

async function getUrlByName(name){
  const url = 'http://weixin.sogou.com/weixin?type=1&ie=utf8&query=' + encodeURIComponent(name);
  const res = await fetch(url, {
    headers: getHeader(),
    //agent: new HttpProxyAgent('http://49.18.5.105:28362')
  });

  const $ = cheerio.load(await res.text());
  return $('#main > div.news-box > ul > li:nth-child(1) > div > div.txt-box > p.tit > a').attr('href');
}

async function getHistoryUrl(url){
  const res = await fetch(url, {
    headers: getHeader(),
    //agent: new HttpProxyAgent('http://49.18.5.105:28362')
  });

  // 提取出url
  const wxMyListString = (await res.text()).match(/var msgList = ({"list":\[{"app_msg_ext_info":.+]});/)[1];
  let wxMyList;
  try {
    wxMyList = JSON.parse(wxMyListString);
  } catch (e){
    // todo: 正确处理error
    throw e;
  }

  return _.get(wxMyList, 'list', []).map(d=>baseUrl + d.app_msg_ext_info.content_url.replace(/&amp;/g, '&'));
}

async function run(){
  const link = await getUrlByName('冷兔');
  const historyUrls = await getHistoryUrl(link);

  console.log(historyUrls);
  await Promise.all(historyUrls.map(u=>
    fetch(u, {
      headers: getHeader(),
    }).then(d=>d.text()).then(console.log)
  ));
}

run().catch(console.error);
