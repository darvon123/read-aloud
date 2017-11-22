
Promise.all([getVoices(), getSettings(), domReady()])
  .then(spread(initialize));

function initialize(voices, settings) {
  //labels
  $("[data-i18n]").each(function() {
    var key = $(this).data("i18n");
    $(this).text(chrome.i18n.getMessage(key));
  });

  //sliders
  $(".slider").each(function() {
    $(this).slider({
      min: $(this).data("min"),
      max: $(this).data("max"),
      step: $(this).data("step")
    })
  });

  //voices
  var groups = groupVoices(voices, function(v) {return isPremiumVoice(v.voiceName)});
  groups[true].sort(voiceSorter);
  groups[false].sort(voiceSorter);
  var standard = $("<optgroup>")
    .attr("label", chrome.i18n.getMessage("options_voicegroup_standard"))
    .appendTo($("#voices"));
  groups[false].forEach(function(voice) {
    $("<option>")
      .val(voice.voiceName)
      .text(voice.voiceName)
      .appendTo(standard);
  });
  $("<optgroup>").appendTo($("#voices"));
  var premium = $("<optgroup>")
    .attr("label", chrome.i18n.getMessage("options_voicegroup_premium"))
    .appendTo($("#voices"));
  groups[true].forEach(function(voice) {
    $("<option>")
      .val(voice.voiceName)
      .text(voice.voiceName)
      .appendTo(premium);
  });

  //rate
  $("#rate-edit-button").click(function() {
    $("#rate, #rate-input-div").toggle();
  });
  $("#rate").on("slidechange", function() {
    $("#rate-input").val(Math.pow($(this).data("pow"), $(this).slider("value")).toFixed(3));
  });
  $("#rate-input").change(function() {
    var val = $(this).val().trim();
    if (isNaN(val)) $(this).val(1);
    else if (val < .1) $(this).val(.1);
    else if (val > 10) $(this).val(10);
    else $("#rate-edit-button").hide();
  });

  //buttons
  $("#save").click(function() {
    updateSettings({
      voiceName: $("#voices").val(),
      rate: Number($("#rate-input").val()),
      pitch: $("#pitch").slider("value"),
      volume: $("#volume").slider("value"),
      showHighlighting: Number($("[name=highlighting]:checked").val()),
    })
    .then(function() {
      $("#save").prop("disabled", true);
      $(".status.success").show().delay(3000).fadeOut();
    });
  });
  $("#reset").click(function() {
    clearSettings().then(() => location.reload());
  });

  //hot key
  $("#hotkeys-link").click(function() {
    chrome.tabs.create({url: 'chrome://extensions/configureCommands'});
  });

  //dirty
  $("#voices, input[name=highlighting]").change(setDirty);
  $("#rate, #pitch, #volume").on("slidechange", setDirty);
  $("#rate-input").on("input", setDirty);

  //set state
  $("#voices").val(settings.voiceName || "");
  $("#rate").slider("value", Math.log(settings.rate || defaults.rate) / Math.log($("#rate").data("pow")));
  $("#rate-input").val(settings.rate || defaults.rate);
  $("#pitch").slider("value", settings.pitch || defaults.pitch);
  $("#volume").slider("value", settings.volume || defaults.volume);
  $("[name=highlighting]").prop("checked", false);
  $("[name=highlighting][value=" + (settings.showHighlighting != null ? settings.showHighlighting : defaults.showHighlighting) + "]").prop("checked", true);
  $("#save").prop("disabled", true);
}


function domReady() {
  return new Promise(function(fulfill) {
    $(fulfill);
  })
}

function groupVoices(voices, keySelector) {
  var groups = {};
  for (var i=0; i<voices.length; i++) {
    var key = keySelector(voices[i]);
    if (groups[key]) groups[key].push(voices[i]);
    else groups[key] = [voices[i]];
  }
  return groups;
}

function voiceSorter(a,b) {
  if (isRemoteVoice(a.voiceName)) {
    if (isRemoteVoice(b.voiceName)) return a.voiceName.localeCompare(b.voiceName);
    else return 1;
  }
  else {
    if (isRemoteVoice(b.voiceName)) return -1;
    else return a.voiceName.localeCompare(b.voiceName);
  }
}

function setDirty() {
  $("#save").prop("disabled", false);
}
