;(function () {
  var GithubProfile,
    injectScript,
    bind = function (fn, me) {
      return function () {
        return fn.apply(me, arguments)
      }
    }

  injectScript = function (opts) {
    var name, ph, script, value
    script = document.createElement('script')
    for (name in opts) {
      value = opts[name]
      script.setAttribute(name, value)
    }
    ph = document.getElementsByTagName('script')[0]
    return ph.parentNode.insertBefore(script, ph)
  }

  GithubProfile = (function () {
    function GithubProfile() {
      this.addTimerIfOnIssue = bind(this.addTimerIfOnIssue, this)
      this.handleMutations = bind(this.handleMutations, this)
      this.listen()
      this.infect()
    }

    GithubProfile.prototype.platformConfig = function () {
      return {
        applicationName: 'GitHub',
      }
    }

    GithubProfile.prototype.listen = function () {
      document.body.addEventListener(
        'harvest-event:ready',
        this.addTimerIfOnIssue
      )
      this.headerButton = this.createButton()
      this.headerButton.classList.add('Button', 'Button--secondary')
      this.commentButton = this.createButton()
      this.commentButton.classList.add('btn')
      return new MutationObserver(this.handleMutations).observe(document.body, {
        childList: true,
        subtree: true,
      })
    }

    GithubProfile.prototype.handleMutations = function (mutations) {
      var i, j, len, len1, node, mutation
      for (i = 0, len = mutations.length; i < len; i++) {
        mutation = mutations[i]

        // Re-add the timer if the button was removed from the DOM
        for (j = 0, len1 = mutation.removedNodes.length; j < len1; j++) {
          node = mutation.removedNodes[j]
          if (
            this.hasBeenRemoved(node, this.headerButton) ||
            this.hasBeenRemoved(node, this.commentButton)
          ) {
            this.addTimerIfOnIssue()
            return
          }
        }

        // Detect when insertion targets appear (e.g. React-rendered issue pages)
        if (
          !document.body.contains(this.headerButton) ||
          !document.body.contains(this.commentButton)
        ) {
          for (j = 0, len1 = mutation.addedNodes.length; j < len1; j++) {
            node = mutation.addedNodes[j]
            if (node.nodeType !== 1) continue
            if (
              node.matches('[data-component="PH_Actions"]') ||
              node.querySelector('[data-component="PH_Actions"]') ||
              node.matches('div.gh-header-actions') ||
              node.querySelector('div.gh-header-actions') ||
              node.matches('#partial-new-comment-form-actions') ||
              node.querySelector('#partial-new-comment-form-actions') ||
              node.matches('[data-testid="markdown-editor-footer"]') ||
              node.querySelector('[data-testid="markdown-editor-footer"]')
            ) {
              this.addTimerIfOnIssue()
              return
            }
          }
        }
      }
    }

    GithubProfile.prototype.hasBeenRemoved = function (node, button) {
      return (
        node.contains(button) &&
        !document.body.contains(button) &&
        button !== node
      )
    }

    GithubProfile.prototype.infect = function () {
      injectScript({
        'data-platform-config': JSON.stringify(this.platformConfig()),
      })
      return document.addEventListener('turbo:load', this.addTimerIfOnIssue)
    }

    GithubProfile.prototype.addTimerIfOnIssue = function () {
      var _, account, group, issueOrPull, item, ref
      ;(ref = window.location.pathname.split('/')),
        (_ = ref[0]),
        (account = ref[1]),
        (group = ref[2]),
        (issueOrPull = ref[3]),
        (item = ref[4])
      if (
        !(
          item &&
          item !== 'new' &&
          (issueOrPull === 'issues' || issueOrPull === 'pull')
        )
      ) {
        return
      }
      return this.addTimer({
        item: {
          id: item,
          name: '#' + item + ': ' + this.issueTitle(),
        },
        group: {
          id: group,
          name: group,
        },
        account: {
          id: account,
        },
      })
    }

    GithubProfile.prototype.issueTitle = function () {
      const issueTitle =
        document.querySelector('.js-issue-title') ||
        document.querySelector('[data-testid="issue-title"]') ||
        document.querySelector('[data-component="PH_Title"] .markdown-title')
      return issueTitle ? issueTitle.innerText : ''
    }

    GithubProfile.prototype.addTimer = function (data) {
      var account,
        actions,
        el,
        formActions,
        group,
        i,
        issueButton,
        item,
        len,
        name,
        permalink,
        ref,
        wrapper
      for (name in data) {
        this.headerButton.dataset[name] = this.commentButton.dataset[name] =
          JSON.stringify(data[name])
      }
      ;(account = data.account), (group = data.group), (item = data.item)
      permalink =
        'https://github.com/' +
        account.id +
        '/' +
        group.id +
        '/issues/' +
        item.id
      this.headerButton.removeAttribute('data-listening')
      this.headerButton.setAttribute('data-permalink', permalink)
      this.commentButton.removeAttribute('data-listening')
      this.commentButton.setAttribute('data-permalink', permalink)
      ref = document.querySelectorAll('.harvest-timer')

      for (i = 0, len = ref.length; i < len; i++) {
        el = ref[i]
        if (el !== this.headerButton && el !== this.commentButton) {
          el.remove()
        }
      }

      if ((actions = document.querySelector('div.gh-header-actions'))) {
        this.headerButton.classList.add('Button--small')
        actions.insertBefore(this.headerButton, actions.children[0])
      } else if (
        (actions = document.querySelector(
          '[data-component="PH_Actions"] [class*="menuActionsContainer"]'
        ))
      ) {
        this.headerButton.classList.remove('Button--small')
        actions.prepend(this.headerButton)
      } else if (
        (actions = document.querySelector('[data-component="PH_Actions"]'))
      ) {
        this.headerButton.classList.add('Button--small')
        actions.prepend(this.headerButton)
      }

      if (
        (formActions =
          document.querySelector('#partial-new-comment-form-actions') ||
          document.querySelector('[data-testid="markdown-editor-footer"]'))
      ) {
        wrapper = document.createElement('div')
        wrapper.classList.add('bg-gray-light', 'mr-1')
        wrapper.appendChild(this.commentButton)
        formActions.children[0].prepend(wrapper)
      }
      return this.notifyPlatformOfNewTimers()
    }

    GithubProfile.prototype.createButton = function () {
      var button
      button = document.createElement('button')
      button.type = 'button'
      button.classList.add('harvest-timer', 'm-0', 'mr-md-0')
      if (document.querySelector("[data-component='PH_Actions']")) {
        button.classList.add('mr-md-1')
      }
      button.setAttribute('data-skip-styling', 'true')
      const buttonContent = document.createElement('span')
      buttonContent.className = 'Button-content'
      const buttonLabel = document.createElement('span')
      buttonLabel.className = 'Button-label'
      const buttonVisual = document.createElement('span')
      buttonVisual.className = 'Button-visual Button-leadingVisual'
      buttonVisual.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"></path></svg>`
      buttonContent.appendChild(buttonVisual)
      buttonContent.appendChild(buttonLabel)
      button.appendChild(buttonContent)
      return button
    }

    GithubProfile.prototype.notifyPlatformOfNewTimers = function () {
      var evt, ref
      evt = new CustomEvent('harvest-event:timers:chrome:add')
      return (ref = document.querySelector('#harvest-messaging')) != null
        ? ref.dispatchEvent(evt)
        : void 0
    }

    return GithubProfile
  })()

  new GithubProfile()
}).call(this)
