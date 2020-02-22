// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, or any plugin's
// vendor/assets/javascripts directory can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file. JavaScript code in this file should be added after the last require_* statement.
//
// Read Sprockets README (https://github.com/rails/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require rails-ujs
//= require_tree .
//= require jquery
//= require bootstrap-sprockets
//= require_tree ./channels

window.addEventListener('load', function() {
  // =========================
  // Logout audio
  // =========================
  logoutAudio = document.querySelector('.logoutAudio')
  clickHandler = function(event) {
    event.preventDefault()
    self = this
    logoutAudio.addEventListener('ended', function() {
      self.removeEventListener('click', clickHandler)
      self.click()
    })
    logoutAudio.currentTime = 0
    logoutAudio.play()
  }
  document.querySelector('#logoutBtn').addEventListener('click', clickHandler)



  // =========================
  // Chat functionality
  // =========================

  // xmlGET
  var httpGet = function(theUrl, callback) {
    var xmlHttp = new XMLHttpRequest()
    xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
        callback(xmlHttp.responseText)
    }
    xmlHttp.open("GET", theUrl, true)
    xmlHttp.send(null)
  }

  // ===========


  // Chat button
  startChatBtn = document.querySelector('.open-chat')
  if (startChatBtn) {
    // Create click hander
    startChatClickHandler = function () {
      httpGet('/users/index.json', function(data) {
        var jsonData = JSON.parse(data)
        var chatList = document.querySelector('.chat-list')
        chatList.innerHTML = '';
        jsonData.forEach(function(message) {
          var chatBtnHTML = `<div class='open-convo-container'>
            <button class='open-convo-btn' data_user_id='${message['id']}' data_username='${message['username']}'>${message['username']}</button>
          </div>
          `;
          chatList.insertAdjacentHTML('beforeend', chatBtnHTML)
        })

        // event listner for clicking open conversation
        openConvoClickHandler = function() {
          // Get required data for conversation
          var userId = this.getAttribute('data_user_id')
          var username = this.getAttribute('data_username')
          var chatFooter = this.parentNode.parentNode.parentNode.parentNode.parentNode

          // Create conversation div
          var convoHTML = `<div class='conversation-container' id='${username}'>
              <button class='conversation-btn'>${username}</button>
              <div class='conversation'> 
                <div class='actions-container'>
                  <textarea class='message-text' id='message-text-${username}'></textarea>
                  <button class='send-message' data_to_user_id='${userId}'>Send Message</button>
                </div>
                <div class='messages-container'>

                </div>
              </div>
            </div>
          `
          chatFooter.insertAdjacentHTML('beforeend', convoHTML)
          
          // Add hide/show event listener to convobutton
          showConvo = function() {
            var chatContainer = this.parentNode
            var conversation = chatContainer.querySelector('.conversation')
            conversation.style.display = 'flex'
            this.removeEventListener('click', showConvo)
            this.addEventListener('click', hideConvo)
          }
          hideConvo = function() {
            var chatContainer = this.parentNode
            var conversation = chatContainer.querySelector('.conversation')
            conversation.style.display = 'none'
            this.removeEventListener('click', hideConvo)
            this.addEventListener('click', showConvo)
          }

          conversationBtns = document.getElementsByClassName('conversation-btn')
          for (var i = 0; i < conversationBtns.length; i++) {
            conversationBtns[i].addEventListener('click', hideConvo)
          }

          // Ajax for last 30 messages
          httpGet(`/conversation?to_user_id=${userId}`, function(data) {
            var jsonData = JSON.parse(data)
            var messageData = JSON.parse(jsonData[1])
            var convoId = jsonData[0]['convo_id']
            var chatContainer = document.querySelector(`#${username}`)
            var sendBtn = chatContainer.querySelector('.send-message')
            sendBtn.setAttribute('data_convo_id', convoId)
            var messagesContainer = chatContainer.querySelector('.messages-container')

            messageData.forEach(function(message) {
              if (message['id'] == 0) {
                var messageHTML = `<div class='no-message message'>
                  ${message['message_content']}
                </div>
                `
              }
              else {
                if (message['sender_id_fk'] == userId) {
                  var messageClass = 'message-recieved'
                }
                else {
                  var messageClass = 'message-sent'
                }
                var dateStr = (new Date(message['created_at'])).toUTCString()
                var messageHTML = `<div class='${messageClass} message'>
                    <div class='message-time'> ${dateStr} </div>
                    <div class='message-content'> ${message['message_content']} </div>
                  </div>
                `
              }
              messagesContainer.insertAdjacentHTML('beforeend', messageHTML)
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            })
            // Subscribe to cable channel

            var sub = App.cable.subscriptions.create({ channel: "MessagesChannel", convo_id: convoId }, {
              received(data) {
                if (data['from_user'] == userId) {
                  var messageClass = 'message-recieved'
                }
                else {
                  var messageClass = 'message-sent'
                }
                var dateStr = (new Date(data['created_at'])).toUTCString()
                var messageHTML = `<div class='${messageClass} message'>
                    <div class='message-time'> ${dateStr} </div>
                    <div class='message-content'> ${data['content']} </div>
                  </div>
                `
                messagesContainer.insertAdjacentHTML('beforeend', messageHTML)
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
              }
            })
            
            convoSubs.push(sub)

          })

          // Event listener for send message
          var sendMessage = function(){
            var toUser = this.getAttribute('data_to_user_id')
            var convoId = this.getAttribute('data_convo_id')
            var actionsContainer = this.parentNode
            var textbox = actionsContainer.querySelector('.message-text')
            var text = textbox.value
            textbox.value = ''
            var messageData = {'message': {'convo_id': convoId, 'to_user': toUser, 'message-content': text}}
            $.ajax({ url: '/message',
              type: 'POST',
              beforeSend: function(xhr) {xhr.setRequestHeader('X-CSRF-Token', $('meta[name="csrf-token"]').attr('content'))},
              data: JSON.stringify(messageData)
            });
          }

          var sendMessageObjs = document.getElementsByClassName("send-message")
          for (var i = 0; i < sendMessageObjs.length; i++) {
              sendMessageObjs[i].addEventListener('click', sendMessage, false)
          }

          



          // End of click on start convo ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        }

        openConvoObjs = document.getElementsByClassName('open-convo-btn')
        for (var i = 0; i < openConvoObjs.length; i++) {
          openConvoObjs[i].addEventListener('click', openConvoClickHandler)
        }

        // End of ajax on users ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      })

      // Show chat list container
      var chatListContainer = document.querySelector('.chat-list-container')
      chatListContainer.style.display = 'block'

      // Remove show click event
      this.removeEventListener('click', startChatClickHandler)

      // Add event listener to hide container and then show again 
      hideChatList = function() {
        chatListContainer.style.display = 'none'
        startChatBtn.removeEventListener('click', hideChatList)
        startChatBtn.addEventListener('click', startChatClickHandler)
      }
      this.addEventListener('click', hideChatList)


      
    }
    startChatBtn.addEventListener('click', startChatClickHandler)
  }
})