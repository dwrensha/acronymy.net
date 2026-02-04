
export async function send_toot(mastodon_url, token, status_text, visibility) {
  if (!mastodon_url) {
    console.error("No mastodon url found. Not tooting.");
    return;
  }

  if (!token) {
    console.error("No token. Not tooting.");
    return;
  }
  const data = new URLSearchParams();
  data.append('status', status_text);
  data.append('visibility', visibility);

  return fetch(mastodon_url + "/api/v1/statuses",
        { method : 'POST',
          headers : {authorization: `Bearer ${token}`,
                    "Content-Type": "application/x-www-form-urlencoded"},
          body : data,
          signal: AbortSignal.timeout(3000), // timeout after 3 seconds
        });
}

export async function send_bloot(did, app_password, record) {
  if (!app_password) {
    console.error("No token. Not posting to Bluesky.");
    return;
  }

  const data = {"identifier": did, "password": app_password};
  const API_KEY_URL='https://bsky.social/xrpc/com.atproto.server.createSession'
  const api_key_response = await fetch(API_KEY_URL,
        { method : 'POST',
          headers : {"Content-Type": "application/json"},
          body : JSON.stringify(data),
          signal: AbortSignal.timeout(2000), // timeout after 2 seconds
        });
  const resp = await api_key_response.json();
  const jwt = resp.accessJwt;

  const post_response = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord",
        { method : 'POST',
          headers : {
            "Authorization": "Bearer " + jwt,
            'Content-Type': 'application/json'
          },
          body : JSON.stringify({ "collection": "app.bsky.feed.post",
                                  "repo": did,
                                  record : record }),
          signal: AbortSignal.timeout(2000) // timeout after 2 seconds
        });
  if (post_response.status != 200) {
    console.error("failed to post to bluesky: ", post_response.status);
  }
  return
}


function credit_to_attribution_string(credit) {
  if (credit.hasOwnProperty("restorer")) {
    let author_text = "anonymously";
    if (credit.author) {
      author_text = "by " + credit.author;
    }
    let restorer_text = "anonymously";
    if (credit.restorer) {
      restorer_text = "by " + credit.restorer;
    }
    return `—submitted ${author_text}, restored ${restorer_text}`;
  } else {
    let attribution = "—submitted anonymously";
    if (credit.author) {
      attribution = "—submitted by " + credit.author;
    }
    return attribution;
  }
}

export async function toot_submission(env, word, new_def, credit) {
  const attribution = credit_to_attribution_string(credit);
  return send_toot(env.MASTODON_URL,
                   env.MASTODON_TOKEN,
                   `${new_def}\n\nhttps://acronymy.net/define/${word}\n${attribution}\n`,
                   "unlisted");
}

export async function bloot_submission(env, word, new_def, credit) {
  const link_uri = `https://acronymy.net/define/${word}`;
  const link_text = `acronymy.net/define/${word}`;

  const attribution = credit_to_attribution_string(credit);
  const text = new_def + '\n\n' + `${link_text}` + `\n${attribution}`;
  const record = {
    "text": text,
    "facets" : [{
      index : { byteStart: new_def.length + 2,
                byteEnd: new_def.length + 2 + link_text.length },
      features : [{
        '$type': 'app.bsky.richtext.facet#link',
        uri: link_uri
      }]
    }],
    "createdAt": (new Date()).toISOString(),
    "$type": "app.bsky.feed.post"
  };
  const DID = "did:plc:qlphhhwkaycflchuflwocd7b" // @acronymy.net
  await send_bloot(DID, env.BLUESKY_PASSWORD, record);
}

export async function post_to_discord(env, channel_id, content) {
  if (!env.DISCORD_TOKEN) {
    console.error("No token. Not posting to Discord.");
    return;
  }

  const post_response = await fetch(
    `https://discord.com/api/v10/channels/${channel_id}/messages`,
        { method : 'POST',
          headers : {
            "Authorization": "Bot " + env.DISCORD_TOKEN,
            'Content-Type': 'application/json'
          },
          body : JSON.stringify({ "content": content }),
          signal: AbortSignal.timeout(2000) // timeout after 2 seconds
        });
  if (post_response.status != 200) {
    console.error("failed to post to Discord: ", post_response.status);
  }
}

export async function post_def_to_discord(env, word, new_def, credit, old_def) {
  const link_uri = `https://acronymy.net/define/${word}`;
  const attribution = credit_to_attribution_string(credit);
  let content = `[**${word}**](${link_uri}): ${new_def} \n${attribution}`;
  if (old_def) {
    content += `\n_previously: ${old_def}_`
  }

  await post_to_discord(env, "1341274691620306944", content);
}
