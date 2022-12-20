class Lapsa
{
	callbacks = {};
	
	slides = [];
	slideContainer = null;
	
	slideShelfContainer = null;
	slideShelf = null;
	shelfIsOpen = false;
	shelfIsAnimating = false;
	shelfMargin = 50;
	shelfIconPaths = ["/icons/up-2.png", "/icons/up-1.png", "/icons/down-1.png", "/icons/down-2.png"];
	
	currentSlide = -1;
	transitionAnimationTime = 150;
	
	buildState = 0;
	numBuilds = 0;
	
	currentlyAnimating = false;
	
	boundFunctions = [null, null, null];
	
	
	
	/*
		options =
		{
			callbacks: {}
		};
	*/
	
	constructor(options)
	{
		this.init(options?.callbacks ?? {});
	}
	
	
	
	init(callbacks)
	{
		this.callbacks = callbacks;
		
		this.slides = document.body.querySelectorAll(".slide");
		this.slideContainer = document.body.querySelector("#lapsa-slide-container");
		
		this.slideShelfContainer = document.createElement("div");
		this.slideShelfContainer.id = "lapsa-slide-shelf-container";
		
		this.slideShelfContainer.innerHTML = `
			<div id="lapsa-slide-shelf" style="margin-left: ${this.shelfMargin}px; opacity: 0">
				<input type="image" id="lapsa-up-2-button" class="shelf-button" src="${this.shelfIconPaths[0]}">
				<input type="image" id="lapsa-up-1-button" class="shelf-button" src="${this.shelfIconPaths[1]}">
				<input type="image" id="lapsa-down-1-button" class="shelf-button" src="${this.shelfIconPaths[2]}">
				<input type="image" id="lapsa-down-2-button" class="shelf-button" src="${this.shelfIconPaths[3]}">
			</div>
		`;
		
		document.body.appendChild(this.slideShelfContainer);
		
		setTimeout(() =>
		{
			this.slideShelf = document.querySelector("#lapsa-slide-shelf");
			this.slideShelf.style.display = "none";
			this.hideSlideShelf(this.slideShelf, 0);
			
			this.slideShelfContainer.addEventListener("mouseenter", () =>
			{
				if (!this.shelfIsOpen)
				{
					this.showShelf();
				}
			});
			
			this.slideShelfContainer.addEventListener("mouseleave", () =>
			{
				if (this.shelfIsOpen)
				{
					this.hideShelf();
				}
			});
			
			this.slideShelf.children[0].addEventListener("click", () => this.previousSlide(true));
			this.slideShelf.children[1].addEventListener("click", () => this.previousSlide());
			this.slideShelf.children[2].addEventListener("click", () => this.nextSlide());
			this.slideShelf.children[3].addEventListener("click", () => this.nextSlide(true));
		}, 100);
		
		
		
		this.slides.forEach(element => element.style.display = "none");
		
		document.documentElement.style.overflowY = "hidden";
		document.body.style.overflowY = "hidden";
		document.body.style.userSelect = "none";
		document.body.style.WebkitUserSelect = "none";
		
		this.boundFunctions[0] = this.handleKeydownEvent.bind(this);
		this.boundFunctions[1] = this.handleTouchstartEvent.bind(this);
		this.boundFunctions[2] = this.handleTouchendEvent.bind(this);
		
		document.documentElement.addEventListener("keydown", this.boundFunctions[0]);
		document.documentElement.addEventListener("touchstart", this.boundFunctions[1]);
		document.documentElement.addEventListener("touchend", this.boundFunctions[2]);
		
		this.nextSlide();
	}
	
	
	
	exit()
	{
		this.slideContainer.remove();
		
		this.slides.forEach(element => element.remove());
		
		document.documentElement.style.overflowY = "visible";
		document.body.style.overflowY = "visible";
		document.body.style.userSelect = "auto";
		document.body.style.WebkitUserSelect = "auto";
		
		document.documentElement.removeEventListener("keydown", this.boundFunctions[0]);
		document.documentElement.removeEventListener("touchstart", this.boundFunctions[1]);
		document.documentElement.removeEventListener("touchend", this.boundFunctions[2]);
	}
	
	
	
	async nextSlide(skipBuilds = false)
	{
		if (this.currentlyAnimating)
		{
			return;
		}
		
		this.currentlyAnimating = true;
		
		if (!skipBuilds && this.numBuilds !== 0 && this.buildState !== this.numBuilds)
		{
			let promises = [];
			
			//Gross code because animation durations are weird as hell -- see the corresponding previous_slide block for a better example.
			this.slides[this.currentSlide].querySelectorAll(`[data-build="${this.buildState}"]`).forEach(element =>
			{
				this.fadeUpIn(element, this.transitionAnimationTime * 2);
				
				promises.push(new Promise((resolve, reject) => setTimeout(resolve, this.transitionAnimationTime)));
			});
			
			try {promises.push(this.callbacks[this.slides[this.currentSlide].id].builds[this.buildState](this.slides[this.currentSlide], true))}
			catch(ex) {}
			
			await Promise.all(promises);
			
			this.buildState++;
			
			this.currentlyAnimating = false;
			
			return;
		}
		
		if (this.currentSlide === this.slides.length)
		{
			this.currentlyAnimating = false;
			
			return;
		}
		
		await this.fadeUpOut(this.slideContainer, this.transitionAnimationTime);
		
		if (this.currentSlide !== -1)
		{
			this.slides[this.currentSlide].style.display = "none";
		}
		
		this.currentSlide++;
		
		if (this.currentSlide === this.slides.length)
		{
			//this.exit();
		}
		
		else
		{
			this.slides[this.currentSlide].style.display = "block";
			
			this.buildState = 0;
			
			const builds = this.slides[this.currentSlide].querySelectorAll(".build");
			
			this.numBuilds = Math.max(builds.length, this.callbacks?.[this.slides[this.currentSlide].id]?.builds?.length ?? 0);
			
			let current_build = 0;
			
			builds.forEach(element =>
			{
				element.style.opacity = 0;
				
				let attr = element.getAttribute("data-build");
				
				if (attr === null)
				{
					element.setAttribute("data-build", current_build);
					
					current_build++;
				}
				
				else
				{
					current_build = parseInt(attr) + 1;
				}
			});
		}
		
		try {await this.callbacks[this.slides[this.currentSlide].id].callback(this.slides[this.currentSlide], true)}
		catch(ex) {}
		
		await this.fadeUpIn(this.slideContainer, this.transitionAnimationTime * 2);
		
		this.currentlyAnimating = false;
	}
	
	
	
	async previousSlide(skipBuilds = false)
	{
		if (this.currentlyAnimating)
		{
			return;
		}
		
		this.currentlyAnimating = true;
		
		
		
		if (!skipBuilds && this.numBuilds !== 0 && this.buildState !== 0)
		{
			this.buildState--;
			
			let promises = [];
			
			this.slides[this.currentSlide].querySelectorAll(`[data-build="${this.buildState}"]`).forEach(element => promises.push(this.fadeDownOut(element, this.transitionAnimationTime)));
			
			try {promises.push(this.callbacks[this.slides[this.currentSlide].id].builds[this.buildState](this.slides[this.currentSlide], false))}
			catch(ex) {}
			
			await Promise.all(promises);
			
			this.currentlyAnimating = false;
			
			return;
		}
		
		
		
		if (this.currentSlide === 0 || this.currentSlide === this.slides.length)
		{
			this.currentlyAnimating = false;
			
			return;
		}
		
		
		
		await this.fadeDownOut(this.slideContainer, this.transitionAnimationTime);
		
		this.slides[this.currentSlide].style.display = "none";
		
		
		
		this.currentSlide--;
		
		const builds = this.slides[this.currentSlide].querySelectorAll(".build");
		
		this.numBuilds = Math.max(builds.length, this.callbacks?.[this.slides[this.currentSlide].id]?.builds?.length ?? 0);
		
		this.buildState = this.numBuilds;
		
		let current_build = 0;
		
		builds.forEach(element =>
		{
			element.style.opacity = 1;
			
			let attr = element.getAttribute("data-build");
			
			if (attr === null)
			{
				element.setAttribute("data-build", current_build);
				
				current_build++;
			}
			
			else
			{
				current_build = parseInt(attr) + 1;
			}
		});
		
		
		
		this.slides[this.currentSlide].style.display = "block";
		
		try {await this.callbacks[this.slides[this.currentSlide].id].callback(this.slides[this.currentSlide], false)}
		catch(ex) {}
		
		await this.fadeDownIn(this.slideContainer, this.transitionAnimationTime * 2);
		
		this.currentlyAnimating = false;
	}
	
	
	
	async jumpToSlide(index)
	{
		if (this.currentlyAnimating)
		{
			return;
		}
		
		this.currentlyAnimating = true;
		
		
		
		if (index < 0 || index >= this.slides.length || index === this.currentSlide)
		{
			this.currentlyAnimating = false;
			
			return;
		}
		
		
		
		const forwardAnimation = index > this.currentSlide;
		
		if (forwardAnimation)
		{
			await this.fadeUpOut(this.slideContainer, this.transitionAnimationTime);
		}
		
		else
		{
			await this.fadeDownOut(this.slideContainer, this.transitionAnimationTime);
		}
		
		
		
		this.slides[this.currentSlide].style.display = "none";
		
		this.currentSlide = index;
		
		this.slides[this.currentSlide].style.display = "block";
		
		
		
		this.buildState = 0;
		
		const builds = this.slides[this.currentSlide].querySelectorAll(".build");
		
		this.numBuilds = Math.max(builds.length, this.callbacks?.[this.slides[this.currentSlide].id]?.builds?.length ?? 0);
		
		let current_build = 0;
		
		builds.forEach(element =>
		{
			element.style.opacity = 0;
			
			let attr = element.getAttribute("data-build");
			
			if (attr === null)
			{
				element.setAttribute("data-build", current_build);
				
				current_build++;
			}
			
			else
			{
				current_build = parseInt(attr) + 1;
			}
		});
		
		
		
		try {await this.callbacks[this.slides[this.currentSlide].id].callback(this.slides[this.currentSlide], true)}
		catch(ex) {}
		
		
		
		if (forwardAnimation)
		{
			await this.fadeUpIn(this.slideContainer, this.transitionAnimationTime * 2);
		}
		
		else
		{
			await this.fadeDownIn(this.slideContainer, this.transitionAnimationTime * 2);
		}
		
		this.currentlyAnimating = false;
	}
	
	
	
	async showShelf()
	{
		this.shelfIsOpen = true;
		this.shelfIsAnimating = true;
		
		this.slideShelf.style.display = "";
		
		await this.showSlideShelf(this.slideShelf, 275);
		
		this.shelfIsAnimating = false;
	}
	
	async hideShelf()
	{
		this.shelfIsOpen = false;
		this.shelfIsAnimating = true;
		
		await this.hideSlideShelf(this.slideShelf, 275);
		
		this.shelfIsAnimating = false;
	}
	
	showSlideShelf(element, duration)
	{
		return new Promise((resolve, reject) =>
		{
			anime({
				targets: element,
				marginLeft: "0px",
				opacity: 1,
				duration: duration,
				easing: "cubicBezier(.4, 1.0, .7, 1.0)",
				complete: resolve
			});
		});	
	}
	
	hideSlideShelf(element, duration)
	{
		return new Promise((resolve, reject) =>
		{
			anime({
				targets: element,
				marginLeft: `${-this.shelfMargin}px`,
				opacity: 0,
				duration: duration,
				easing: "cubicBezier(.4, 0.0, .4, 1.0)",
				complete: resolve
			});
		});	
	}
	
	
	
	handleKeydownEvent(e)
	{
		if (e.keyCode === 39 || e.keyCode === 40 || e.keyCode === 32 || e.keyCode === 13)
		{
			this.nextSlide();
		}
		
		else if (e.keyCode === 37 || e.keyCode === 38)
		{
			this.previousSlide();
		}
	}
	
	
	
	maxTouches = 0;
	
	handleTouchstartEvent(e)
	{
		this.maxTouches = Math.max(this.maxTouches, e.touches.length);
	}
	
	handleTouchendEvent(e)
	{
		if (this.maxTouches === 2)
		{
			this.nextSlide();
		}
		
		else if (this.maxTouches === 3 && !this.shelfIsAnimating)
		{
			if (!this.shelfIsOpen)
			{
				this.showShelf();
			}
			
			else
			{
				this.hideShelf();
			}
		}
		
		this.maxTouches = 0;
	}
	
	
	
	getCurrentSlide()
	{
		return this.slides[this.currentSlide];
	}
	
	
	
	fadeUpIn(element, duration)
	{
		return new Promise((resolve, reject) =>
		{
			element.style.marginTop = `${window.innerHeight / 40}px`;
			element.style.marginBottom = 0;
			
			anime({
				targets: element,
				marginTop: "0px",
				opacity: 1,
				duration: duration,
				easing: "cubicBezier(.4, 1.0, .7, 1.0)",
				complete: resolve
			});
		});
	}
	
	fadeUpOut(element, duration)
	{
		return new Promise((resolve, reject) =>
		{
			element.style.marginBottom = "20vmin";
			
			anime({
				targets: element,
				marginTop: `${-window.innerHeight / 40}px`,
				opacity: 0,
				duration: duration,
				easing: "cubicBezier(.1, 0.0, .2, 0.0)",
				complete: resolve
			});
		});
	}
	
	fadeDownIn(element, duration)
	{
		return new Promise((resolve, reject) =>
		{
			element.style.marginTop = `${-window.innerHeight / 40}px`;
			element.style.marginBottom = 0;
			
			anime({
				targets: element,
				marginTop: "0px",
				opacity: 1,
				duration: duration,
				easing: "cubicBezier(.4, 1.0, .7, 1.0)",
				complete: resolve
			});
		});
	}
	
	fadeDownOut(element, duration)
	{
		return new Promise((resolve, reject) =>
		{
			element.style.marginBottom = "20vmin";
			
			anime({
				targets: element,
				marginTop: `${window.innerHeight / 40}px`,
				opacity: 0,
				duration: duration,
				easing: "cubicBezier(.1, 0.0, .2, 0.0)",
				complete: resolve
			});
		});
	}
}