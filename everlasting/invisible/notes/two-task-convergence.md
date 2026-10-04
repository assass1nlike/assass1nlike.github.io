# 特定规则下双任务优化的收敛保证

> 改编自 https://arxiv.org/abs/2506.08164

目录

-   定理陈述
    
-   定理的证明
    
-   含义解读
    

# 定理陈述

假设连续可微函数 $f$ 和 $r$ 满足：

(a) $f$ 的梯度是 $L_f$\-Lipschitz 连续的，即对于任意 $\mathbf{x},\mathbf{y}\in\mathbb{R}^d$，都有

$$
\|\nabla f(\mathbf{x})-\nabla f(\mathbf{y})\|
\le L_f\|\mathbf{x}-\mathbf{y}\|.
$$

(b) $r$ 的梯度是 $L_r$\-Lipschitz 连续的。

(c) 存在常数 $C<\infty$，使得

$$
|f(\mathbf{x})|,\ |r(\mathbf{x})|,\ 
\|\nabla f(\mathbf{x})\|,\ \|\nabla r(\mathbf{x})\|
\le C.
$$

那么，通过更新法则

$$
u(\theta)
= \gamma \nabla f(\theta)
+ \nabla r(\theta)
- \frac{\langle \nabla f(\theta), \nabla r(\theta)\rangle}
{\|\nabla f(\theta)\|^2}\nabla f(\theta),\\\\
\theta(t+1)=\theta(t)-\eta\cdot u(\theta(t))
\tag{1}
$$

得到的模型满足：

$$
\frac{1}{T}\sum_{t=0}^{T-1}
\|\nabla f(\theta(t))\|^2
\le
\frac{2C}{T\eta\gamma}+\frac{L_f}{2\gamma}\eta C_1^2.
$$

以及

$$
\frac{1}{T}\sum_{t=0}^{T-1}
\|u(\theta(t))\|^2
\le
\frac{4C}{\eta T(2-L_r)}(1+2C\gamma)
+\frac{2L_f\gamma\eta C_1^2}{2-L_r}
+\frac{4\gamma\sqrt{T}}{T(2-L_r)}\sqrt{\frac{2C}{\eta\gamma}
+\frac{L_f}{2\gamma}\eta C_1^2T},
$$

这里 $C_1:=(2+\gamma)C$.

# 定理的证明

先证明这样五个结论：

$$
\text{(a)}\qquad
\langle \nabla f(\theta),u(\theta)\rangle
=\gamma\|\nabla f(\theta)\|^2.
$$

$$
\text{(b)}\qquad
\|u(\theta)\|\le C_1,
$$

$$
\text{(c)}\qquad
\xi(\theta)\|\nabla f(\theta)\|^2
\le \gamma\|\nabla f(\theta)\|^2
+C\|\nabla f(\theta)\|,
$$

$$
\text{(d)}\qquad
\xi(\theta)\langle \nabla f(\theta),u(\theta)\rangle
\le \gamma^2\|\nabla f(\theta)\|^2
+C\gamma\|\nabla f(\theta)\|,
$$

$$
\text{(e)}\qquad
\langle \nabla r(\theta),u(\theta)\rangle
\ge \|u(\theta)\|^2
-\gamma^2\|\nabla f(\theta)\|^2
-C\gamma\|\nabla f(\theta)\|,
$$

其中

$$
\xi(\theta):=
\frac{\gamma\|\nabla f(\theta)\|^2
-\langle \nabla f(\theta),\nabla r(\theta)\rangle}
{\|\nabla f(\theta)\|^2}.
$$

**证明。** 根据定义，有

$$
\begin{aligned}
\langle \nabla f(\theta),u(\theta)\rangle
&=\gamma\|\nabla f(\theta)\|^2+\langle \nabla f(\theta),\nabla r(\theta)\rangle
-\langle \nabla r(\theta),\nabla r(\theta)\rangle\\
&=\gamma\|\nabla f(\theta)\|^2,
\end{aligned}
$$

这就证明了 (a)；

$$
\begin{aligned}
\|u(\theta)\|
&=\|\xi(\theta)\nabla f(\theta)+\nabla r(\theta)\|\\
&\le |\xi(\theta)|\|\nabla f(\theta)\|
+\|\nabla r(\theta)\|\\
&\le \gamma\|\nabla f(\theta)\|
+\frac{|\langle \nabla f(\theta),\nabla r(\theta)\rangle|}
{\|\nabla f(\theta)\|}
+\|\nabla r(\theta)\|\\
&\le
\gamma\|\nabla f(\theta)\|+2\|\nabla r(\theta)\|\\
&\le (2+\gamma)C\\
&=C_1
\end{aligned}
$$

这就证明了 (b)；

$$
\begin{aligned}
\xi(\theta)\|\nabla f(\theta)\|^2
&=\gamma\|\nabla f(\theta)\|^2
-\langle \nabla f(\theta),\nabla r(\theta)\rangle\\
&\le \gamma\|\nabla f(\theta)\|^2
+\|\nabla f(\theta)\|\cdot\|\nabla r(\theta)\|\\
&\le \gamma\|\nabla f(\theta)\|^2
+C\|\nabla f(\theta)\|,
\end{aligned}
$$

这就证明了 (c)；

$$
\begin{aligned}
\xi(\theta)\langle \nabla f(\theta),u(\theta)\rangle
&=\xi(\theta)
\left\langle \nabla f(\theta),
\xi(\theta)\nabla f(\theta)+\nabla r(\theta)\right\rangle\\
&=\xi(\theta)\left(
\xi(\theta)\|\nabla f(\theta)\|^2
+\langle \nabla f(\theta),\nabla r(\theta)\rangle\right)\\
&=\xi(\theta)\left(
\gamma\|\nabla f(\theta)\|^2
-\langle \nabla f(\theta),\nabla r(\theta)\rangle
+\langle \nabla f(\theta),\nabla r(\theta)\rangle\right)\\
&=\xi(\theta)\gamma\|\nabla f(\theta)\|^2.
\end{aligned}
$$

结合结论 (c)，就证明了 (d)；

利用 (d) 的结果：

$$
\begin{aligned}
\langle \nabla r(\theta),u(\theta)\rangle
&=\left\langle
u(\theta)-\xi(\theta)\nabla f(\theta),u(\theta)
\right\rangle\\
&=\|u(\theta)\|^2
-\xi(\theta)\langle \nabla f(\theta),u(\theta)\rangle\\
&\ge \|u(\theta)\|^2
-\gamma^2\|\nabla f(\theta)\|^2
-C\gamma\|\nabla f(\theta)\|.
\end{aligned}
$$

就证明了 (e).

至此引理都证明完，开始正式结论的证明。

利用 $f$ 的 $L_f$\-Lipschitz 连续性，有

$$
\begin{aligned}
f(\theta(t+1))-f(\theta(t))
&\le \left\langle \nabla f(\theta(t)),\theta(t+1)-\theta(t)\right\rangle
+\frac{L_f}{2}\left\|\theta(t+1)-\theta(t)\right\|^2\\
&= -\eta\left\langle \nabla f(\theta(t)),u(\theta(t))\right\rangle
+\frac{L_f}{2}\eta^2\left\|u(\theta(t))\right\|^2\\
&= -\eta\gamma\left\|\nabla f(\theta(t))\right\|^2
+\frac{L_f}{2}\eta^2\left\|u(\theta(t))\right\|^2\\
&\le -\eta\gamma\left\|\nabla f(\theta(t))\right\|^2
+\frac{L_f}{2}\eta^2 C_1^2,
\end{aligned}
$$

倒数第二个等号使用了 (a)，最后一个不等号使用了 (b). 对上式求和，得到：

$$
\frac{1}{T}\sum_{t=0}^{T-1}\left\|\nabla f(\theta(t))\right\|^2
\le \frac{1}{T\eta\gamma}\bigl(f(\theta(0))-f(\theta(T))\bigr)
+\frac{L_f}{2\gamma}\eta C_1^2
\le \frac{2C}{T\eta\gamma}+\frac{L_f}{2\gamma}\eta C_1^2,
$$

最后一步使用了条件中对于 $f$ 函数值有界的假设。

类似地，由于 $r$ 是 $L_r$\-Lipschitz 连续的，有

$$
\begin{aligned}
r(\theta(t+1))-r(\theta(t))
&\le \left\langle \nabla r(\theta(t)),\theta(t+1)-\theta(t)\right\rangle
+\frac{L_r}{2}\left\|\theta(t+1)-\theta(t)\right\|^2\\
&= \left\langle u(\theta(t))-\xi(\theta(t))\nabla f(\theta(t)),-\eta u(\theta(t))\right\rangle
+\frac{L_r}{2}\left\|-\eta u(\theta(t))\right\|^2\\
&= -\eta\left\|u(\theta(t))\right\|^2
+\eta\xi(\theta(t))
\left\langle \nabla f(\theta(t)),u(\theta(t))\right\rangle
+\frac{L_r}{2}\eta^2\left\|u(\theta(t))\right\|^2\\
&\le
-\eta(1-\frac{L_r}{2})\left\|u(\theta(t))\right\|^2
+\eta\left(\gamma^2\left\|\nabla f(\theta(t))\right\|^2
+C\gamma\left\|\nabla f(\theta(t))\right\|\right).
\end{aligned}
$$

则

$$
\|u(\theta(t))\|\le\frac{2(r(\theta(t))-r(\theta(t+1)))}{\eta(2-L_r)}
+
\frac{2}{2-L_r}\left(\gamma^2\left\|\nabla f(\theta(t))\right\|^2
+C\gamma\left\|\nabla f(\theta(t))\right\|\right)
$$

对它求和，可得

$$
\begin{aligned}
\frac{1}{T}\sum_{t=0}^{T-1}\|u(\theta(t))\|^2
&\le \frac{2}{\eta T(2-L_r)}\bigl(r(\theta(0))-r(\theta(t))\bigr)\\
&\quad+\frac{4}{T(2-L_r)}\left(
\gamma^2\sum_{t=0}^{T-1}\|\nabla f(\theta(t))\|^2
+\gamma\sum_{t=0}^{T-1}\|\nabla f(\theta(t))\|
\right)\\
&\le \frac{4C}{\eta T(2-L_r)}
+\frac{4}{T(2-L_r)}\left(
\gamma^2\sum_{t=0}^{T-1}\|\nabla f(\theta(t))\|^2
+\gamma\sum_{t=0}^{T-1}\|\nabla f(\theta(t))\|
\right)\\
&\le
\frac{4C}{\eta T(2-L_r)}
+\frac{4}{T(2-L_r)}\left(
\gamma^2\sum_{t=0}^{T-1}\|\nabla f(\theta(t))\|^2
+\gamma\sqrt{T}
\sqrt{\sum_{t=0}^{T-1}\|\nabla f(\theta(t))\|^2}
\right)\\
&\le
\frac{4C}{\eta T(2-L_r)}
+\frac{4}{T(2-L_r)}\left(
\frac{2C\gamma}{\eta}
+\frac{L_f\gamma}{2}\eta C_1^2T
+\gamma\sqrt{T}
\sqrt{\frac{2C}{\eta\gamma}
+\frac{L_f}{2\gamma}\eta C_1^2T}
\right)\\
&=
\frac{4C}{\eta T(2-L_r)}(1+2C\gamma)
+\frac{2L_f\gamma\eta C_1^2}{2-L_r}
+\frac{4\gamma\sqrt{T}}{T(2-L_r)}\sqrt{\frac{2C}{\eta\gamma}
+\frac{L_f}{2\gamma}\eta C_1^2T},
\end{aligned}
$$

# 含义解读

式 (1) 给出的更新法则其实是如下含义：

首先保证在 $\nabla f(\theta)$ 的方向上能达到 $\gamma$ 的步长：

$$
\langle \nabla f(\theta),u(\theta)\rangle
=\gamma\|\nabla f(\theta)\|^2
$$

之后，添加一份优化目标 $r$ 的参数更新 $\nabla r$. 但是不希望这一更新对 $f$ 有所损害，因此减去 $\nabla r$ 在 $\nabla f$ 上的投影：

$$
\frac{\langle \nabla f(\theta), \nabla r(\theta)\rangle}
{\|\nabla f(\theta)\|^2}\nabla f(\theta)
$$

综合两个式子，就得出了

$$
u(\theta)
= \gamma \nabla f(\theta)
+ \nabla r(\theta)
- \frac{\langle \nabla f(\theta), \nabla r(\theta)\rangle}
{\|\nabla f(\theta)\|^2}\nabla f(\theta),\\\\
\theta(t+1)=\theta(t)-\eta\cdot u(\theta(t))
$$

的设计动机。事实上这种方法非常像 GRU，参见 [Gradient Rectified Unlearning (GRU) 方法设计与理论优势​](https://www.bilibili.com/opus/1237970154963337222?spm_id_from=333.1369.0.0)

而推出的两项结果代表什么呢？首先

$$
\frac{1}{T}\sum_{t=1}^T\|\nabla f(\theta(t))\|=O(\frac{1}{T})
$$

意味着 $\|\nabla f(\theta(t))\|\rightarrow0$. 这说明消除优化 $r$ 对 $f$ 造成的损害这一做法确实是有效的，可以将 $f$ 优化到一个近似驻点；而对 $\frac{1}{T}\sum_{t=1}^T\|\nabla u(\theta(t))\|$ 给出的上界，说明了方法整体的收敛性。

> 封面取自
> 
> https://osu.ppy.sh/beatmapsets/2079229#osu/4353904
> 
> Harano Oni - ""
